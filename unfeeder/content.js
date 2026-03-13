const STORAGE_KEY = "feedDashboardState";
const LOCK_AFTER_MS = 30 * 60 * 1000;   // 30 minutes
const BYPASS_DURATION_MS = 60 * 60 * 1000; // 1 hour

(async function () {
  const hostname = location.hostname.replace(/^www\./, "");

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const state = data[STORAGE_KEY];
  if (!state?.feeds?.length) return;

  // Find feeds whose domain matches the current page
  const matchingFeeds = state.feeds.filter((f) => {
    try {
      return new URL(f.url).hostname.replace(/^www\./, "") === hostname;
    } catch { return false; }
  });
  if (!matchingFeeds.length) return;

  // Check for active bypass
  const bypass = state.domainBypass?.[hostname];
  if (bypass && bypass > Date.now()) return;

  // Check if any matching feed was visited more than 30 min ago today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const timestamps = state.visitTimestamps || {};
  const isLocked = matchingFeeds.some((f) => {
    const ts = timestamps[f.id];
    return ts && ts >= todayStartMs && (Date.now() - ts) > LOCK_AFTER_MS;
  });
  if (!isLocked) return;

  showChallenge(hostname);
})();

function showChallenge(hostname) {
  const { question, answer } = generateMath();

  const overlay = document.createElement("div");
  overlay.id = "unfeeder-overlay";
  overlay.style.cssText = [
    "position:fixed", "inset:0", "z-index:2147483647",
    "background:#0f172a", "color:#f8fafc",
    "display:flex", "flex-direction:column",
    "align-items:center", "justify-content:center",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  ].join(";");

  overlay.innerHTML = `
    <div style="max-width:400px;width:90%;text-align:center;padding:40px 20px;font-size:16px;">
      <div style="font-size:38px;margin-bottom:12px;">🔒</div>
      <h2 style="margin:0 0 10px;font-size:22px;font-weight:400;color:#FFFFFF;">Reading time's up</h2>
      <p style="color:#94a3b8;margin:0 0 28px;font-size:15px;line-height:1.5;">
        You've already read from <strong style="color:#e2e8f0;">${hostname}</strong> today.<br>
        Solve this to unlock 30 more minutes.
      </p>
      <div style="font-size:42px;font-weight:800;letter-spacing:0.02em;margin-bottom:24px;">${question}</div>
      <input id="unfeeder-input" type="number" placeholder="Your answer"
        style="width:100%;padding:14px;border-radius:10px;border:2px solid #334155;
               background:#1e293b;color:#f8fafc;font-size:19px;text-align:center;
               outline:none;box-sizing:border-box;" />
      <div id="unfeeder-error" style="color:#f87171;margin-top:10px;min-height:22px;font-size:14px;"></div>
      <button id="unfeeder-submit"
        style="margin-top:14px;width:100%;padding:14px;background:#2563eb;color:#fff;
               border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;">
        Unlock for 30 minutes
      </button>
    </div>
  `;

  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#unfeeder-input");
  const errorEl = overlay.querySelector("#unfeeder-error");
  const btn = overlay.querySelector("#unfeeder-submit");

  input.focus();

  function trySubmit() {
    const val = parseInt(input.value, 10);
    if (val === answer) {
      chrome.storage.local.get(STORAGE_KEY).then((data) => {
        const s = data[STORAGE_KEY] || {};
        if (!s.domainBypass) s.domainBypass = {};
        s.domainBypass[hostname] = Date.now() + BYPASS_DURATION_MS;
        return chrome.storage.local.set({ [STORAGE_KEY]: s });
      }).then(() => {
        overlay.remove();
        document.body.style.overflow = "";
      });
    } else {
      errorEl.textContent = "Wrong answer — try again.";
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", trySubmit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") trySubmit();
    if (e.key !== "Tab") errorEl.textContent = "";
  });
}

function generateMath() {
  const type = Math.floor(Math.random() * 3);
  let a, b, answer, op;

  if (type === 0) {
    a = Math.floor(Math.random() * 60) + 15;
    b = Math.floor(Math.random() * 60) + 15;
    op = "+"; answer = a + b;
  } else if (type === 1) {
    a = Math.floor(Math.random() * 50) + 30;
    b = Math.floor(Math.random() * 25) + 5;
    op = "−"; answer = a - b;
  } else {
    a = Math.floor(Math.random() * 8) + 3;
    b = Math.floor(Math.random() * 8) + 3;
    op = "×"; answer = a * b;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}
