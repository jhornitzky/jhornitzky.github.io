const STORAGE_KEY = "feedDashboardState";

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  await checkTab(tab.url);
});

// Backup: also check when the user switches focus to a tab.
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await checkTab(tab.url);
  } catch (_) {}
});

async function checkTab(url) {
  if (!url || !url.startsWith("http")) return;

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const state = data[STORAGE_KEY];
  if (!state?.feeds?.length) return;

  const todayKey = getTodayKey();
  if (!state.completionByDate[todayKey]) state.completionByDate[todayKey] = {};

  const match = state.feeds.find((f) => urlMatches(url, f.url));
  if (!match || state.completionByDate[todayKey][match.id]) return;

  state.completionByDate[todayKey][match.id] = true;
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function urlMatches(tabUrl, feedUrl) {
  if (tabUrl.startsWith(feedUrl)) return true;
  try {
    const t = new URL(tabUrl);
    const f = new URL(feedUrl);
    const tHost = t.hostname.replace(/^www\./, "");
    const fHost = f.hostname.replace(/^www\./, "");
    return tHost === fHost && t.pathname.startsWith(f.pathname);
  } catch {
    return false;
  }
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
