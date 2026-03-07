// ── Helpers ───────────────────────────────────────────────────────────────────
function storageKey(url) {
  try {
    const { origin, pathname } = new URL(url);
    return `zenprotector:${origin}${pathname}`;
  } catch {
    return `zenprotector:${url}`;
  }
}

function updateBadge(tabId, comparative) {
  if (comparative < -0.05) {
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
  } else if (comparative > 0.05) {
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// ── On open: restore last result + load auto-scan toggle state ────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const key = storageKey(tab.url);
  chrome.storage.local.get([key, 'zenprotectorAutoScan'], (items) => {
    const saved = items[key];
    if (saved) showResults(saved, /* restored */ true);

    const toggle = document.getElementById('autoScanToggle');
    toggle.checked = !!items.zenprotectorAutoScan;
  });
});

// ── Auto-scan toggle ──────────────────────────────────────────────────────────
document.getElementById('autoScanToggle').addEventListener('change', (e) => {
  chrome.storage.local.set({ zenprotectorAutoScan: e.target.checked });
});

// ── Scan ──────────────────────────────────────────────────────────────────────
document.getElementById('scanBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  document.getElementById('scanBtn').disabled = true;
  document.getElementById('scanBtn').textContent = 'Scanning...';

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });

    const readback = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__zenprotectorResult,
    });

    const data = readback[0]?.result;
    if (data) {
      const record = { ...data, scannedAt: Date.now(), url: tab.url };
      chrome.storage.local.set({ [storageKey(tab.url)]: record });
      updateBadge(tab.id, data.comparative);
      showResults(record, /* restored */ false);
    }
  } catch {
    // scan failed silently (e.g. chrome:// pages)
  }

  document.getElementById('scanBtn').disabled = false;
  document.getElementById('scanBtn').textContent = 'Re-scan Page';
  document.getElementById('clearBtn').style.display = 'block';
});

// ── Clear ─────────────────────────────────────────────────────────────────────
document.getElementById('clearBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      document.querySelectorAll('.zenprotector-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent));
      });
    }
  });
  chrome.storage.local.remove(storageKey(tab.url));
  chrome.action.setBadgeText({ text: '', tabId: tab.id });
  document.getElementById('results').style.display = 'none';
  document.getElementById('clearBtn').style.display = 'none';
  document.getElementById('scanBtn').textContent = 'Scan Page';
});

// ── Display ───────────────────────────────────────────────────────────────────
function showResults(data, restored) {
  const { negCount, posCount, totalWords, comparative, scannedAt } = data;
  document.getElementById('results').style.display = 'block';
  document.getElementById('clearBtn').style.display = 'block';

  document.getElementById('negCount').textContent = negCount;
  document.getElementById('posCount').textContent = posCount;
  document.getElementById('totalCount').textContent = totalWords;

  const badge = document.getElementById('scoreBadge');
  const meter = document.getElementById('meterFill');
  const scoreEl = document.getElementById('scoreValue');
  const timestampEl = document.getElementById('scanTimestamp');

  scoreEl.textContent = (comparative >= 0 ? '+' : '') + comparative.toFixed(2);

  const MAX = 3;
  const clamped = Math.max(-MAX, Math.min(MAX, comparative));
  const barWidth = Math.round(((clamped + MAX) / (MAX * 2)) * 100);

  if (comparative > 0.05) {
    badge.textContent = 'Positive';
    badge.className = 'score-badge positive';
    scoreEl.className = 'score-value positive';
    meter.style.width = `${barWidth}%`;
    meter.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
  } else if (comparative < -0.05) {
    badge.textContent = 'Negative';
    badge.className = 'score-badge negative';
    scoreEl.className = 'score-value negative';
    meter.style.width = `${barWidth}%`;
    meter.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
  } else {
    badge.textContent = 'Neutral';
    badge.className = 'score-badge neutral';
    scoreEl.className = 'score-value neutral';
    meter.style.width = '50%';
    meter.style.background = '#475569';
  }

  if (scannedAt) {
    const d = new Date(scannedAt);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    timestampEl.textContent = `${restored ? 'Last scanned' : 'Scanned'} ${date} at ${time}`;
  }
}
