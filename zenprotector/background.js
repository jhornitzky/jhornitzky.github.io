// ── Helpers (duplicated from popup.js — no shared module in MV3 workers) ──────
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

// ── Auto-scan on page load ────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || /^(chrome|chrome-extension|about|data):/.test(tab.url)) return;

  const { zenprotectorAutoScan } = await chrome.storage.local.get('zenprotectorAutoScan');
  if (!zenprotectorAutoScan) return;

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });

    const readback = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.__zenprotectorResult,
    });

    const data = readback[0]?.result;
    if (!data) return;

    const record = { ...data, scannedAt: Date.now(), url: tab.url };
    await chrome.storage.local.set({ [storageKey(tab.url)]: record });
    updateBadge(tabId, data.comparative);
  } catch {
    // Page not injectable (e.g. PDF, extension pages)
  }
});

// ── Clear badge when tab navigates away ──────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
