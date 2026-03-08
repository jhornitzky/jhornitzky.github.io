const STORAGE_KEY = "feedDashboardState";
const SETTINGS_KEY = "goldenSettings";
const DEFAULT_WIDTH = 800;

const feedNameInput = document.getElementById("feed-name");
const feedUrlInput = document.getElementById("feed-url");
const addFeedButton = document.getElementById("add-feed");
const showAddButton = document.getElementById("show-add");
const cancelAddButton = document.getElementById("cancel-add");
const addDialog = document.getElementById("add-dialog");
const modalBackdrop = document.getElementById("modal-backdrop");
const openAllButton = document.getElementById("open-all");
const showSettingsButton = document.getElementById("show-settings");
const settingsDialog = document.getElementById("settings-dialog");
const closeSettingsButton = document.getElementById("close-settings");
const windowWidthInput = document.getElementById("window-width");
const feedList = document.getElementById("feed-list");
const toggleVisitedButton = document.getElementById("toggle-visited");
const visitedList = document.getElementById("visited-list");
const feedItemTemplate = document.getElementById("feed-item-template");

let visitedExpanded = false;

const todayKey = getTodayKey();
let state = { feeds: [], completionByDate: {} };

init().catch((error) => {
  console.error(error);
  console.error("Could not initialize dashboard.");
});

async function init() {
  state = await loadState();
  ensureDayBucket(todayKey);

  const settings = await loadSettings();
  windowWidthInput.value = settings.windowWidth;

  showSettingsButton.addEventListener("click", () => {
    settingsDialog.classList.remove("hidden");
    modalBackdrop.classList.remove("hidden");
  });
  closeSettingsButton.addEventListener("click", saveSettingsAndClose);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDialog(); saveSettingsAndClose(); }
  });

  windowWidthInput.addEventListener("change", () => {
    const w = Math.max(320, Math.min(2560, parseInt(windowWidthInput.value, 10) || DEFAULT_WIDTH));
    windowWidthInput.value = w;
  });

  toggleVisitedButton.addEventListener("click", () => {
    visitedExpanded = !visitedExpanded;
    visitedList.classList.toggle("hidden", !visitedExpanded);
    render();
  });

  showAddButton.addEventListener("click", openDialog);
  cancelAddButton.addEventListener("click", closeDialog);
  modalBackdrop.addEventListener("click", () => {
    closeDialog();
    saveSettingsAndClose();
  });
  addFeedButton.addEventListener("click", onAddFeed);
  openAllButton.addEventListener("click", openAllTiled);

  feedNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); feedUrlInput.focus(); }
  });
  feedUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); onAddFeed(); }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) {
      state = changes[STORAGE_KEY].newValue;
      ensureDayBucket(todayKey);
      render();
    }
  });

  render();
}

function openDialog() {
  addDialog.classList.remove("hidden");
  modalBackdrop.classList.remove("hidden");
  feedNameInput.focus();
}

function closeDialog() {
  addDialog.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
  feedNameInput.value = "";
  feedUrlInput.value = "";
}

async function saveSettingsAndClose() {
  const w = Math.max(320, Math.min(2560, parseInt(windowWidthInput.value, 10) || DEFAULT_WIDTH));
  windowWidthInput.value = w;
  await chrome.storage.local.set({ [SETTINGS_KEY]: { windowWidth: w } });
  settingsDialog.classList.add("hidden");
  modalBackdrop.classList.add("hidden");
}

function render() {
  const completion = state.completionByDate[todayKey] || {};
  feedList.innerHTML = "";

  state.feeds.filter((feed) => !completion[feed.id]).forEach((feed) => {
    renderFeedItem(feed);
  });

  const unvisitedCount = state.feeds.filter((f) => !completion[f.id]).length;
  openAllButton.disabled = unvisitedCount === 0;
  openAllButton.textContent = unvisitedCount > 0
    ? `Open all unvisited (${unvisitedCount})`
    : "All visited today";

  if (!feedList.children.length) {
    const empty = document.createElement("li");
    empty.className = "feed-item feed-item--empty";
    empty.textContent = state.feeds.length
      ? "You're up to date. Links return tomorrow."
      : "No links yet. Add one above to start.";
    feedList.appendChild(empty);
  }

  const visitedFeeds = state.feeds.filter((f) => completion[f.id]);
  if (visitedFeeds.length) {
    toggleVisitedButton.classList.remove("hidden");
    toggleVisitedButton.textContent = visitedExpanded
      ? `▾ Hide visited (${visitedFeeds.length})`
      : `▸ Show visited (${visitedFeeds.length})`;
    visitedList.innerHTML = "";
    if (visitedExpanded) {
      visitedFeeds.forEach((feed) => renderVisitedItem(feed));
    }
  } else {
    toggleVisitedButton.classList.add("hidden");
    visitedList.classList.add("hidden");
  }
}

function renderFeedItem(feed) {
  const node = feedItemTemplate.content.firstElementChild.cloneNode(true);
  const nameEl = node.querySelector(".feed-name");
  const urlEl = node.querySelector(".feed-url");
  const openBtn = node.querySelector(".btn-open");
  const removeBtn = node.querySelector(".btn-remove");

  nameEl.textContent = feed.name;
  urlEl.href = feed.url;
  urlEl.textContent = feed.url;
  urlEl.addEventListener("click", async () => {
    state.completionByDate[todayKey][feed.id] = true;
    await saveState();
    render();
  });

  openBtn.addEventListener("click", async () => {
    openInWindow(feed.url);
    state.completionByDate[todayKey][feed.id] = true;
    await saveState();
    render();
  });

  removeBtn.addEventListener("click", async () => {
    state.feeds = state.feeds.filter((item) => item.id !== feed.id);
    Object.keys(state.completionByDate).forEach((key) => {
      delete state.completionByDate[key][feed.id];
    });
    await saveState();
    render();

  });

  feedList.appendChild(node);
}

function renderVisitedItem(feed) {
  const node = feedItemTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add("visited");
  node.querySelector(".feed-name").textContent = feed.name;
  const urlEl = node.querySelector(".feed-url");
  urlEl.href = feed.url;
  urlEl.textContent = feed.url;
  node.querySelector(".btn-open").addEventListener("click", () => openInWindow(feed.url));
  const removeBtn = node.querySelector(".btn-remove");
  removeBtn.textContent = "Untick";
  removeBtn.classList.replace("btn-remove", "btn-untick");
  removeBtn.addEventListener("click", async () => {
    delete state.completionByDate[todayKey][feed.id];
    await saveState();
    render();
  });
  visitedList.appendChild(node);
}

function getWindowWidth() {
  return Math.max(320, Math.min(2560, parseInt(windowWidthInput.value, 10) || DEFAULT_WIDTH));
}

function openInWindow(url) {
  const w = getWindowWidth();
  const sh = window.screen.availHeight;
  const baseLeft = stackBaseLeft(w);
  chrome.windows.create({ url, left: baseLeft, top: 0, width: w, height: sh, type: "popup" });
}

async function openAllTiled() {
  const completion = state.completionByDate[todayKey] || {};
  const unvisited = state.feeds.filter((f) => !completion[f.id]);
  if (!unvisited.length) return;

  const w = getWindowWidth();
  const sh = window.screen.availHeight;
  const baseLeft = stackBaseLeft(w);
  const offset = 30;

  for (let i = unvisited.length - 1; i >= 0; i--) {
    chrome.windows.create({
      url: unvisited[i].url,
      left: baseLeft + i * offset,
      top: i * offset,
      width: w,
      height: sh,
      type: "popup"
    });
    state.completionByDate[todayKey][unvisited[i].id] = true;
  }

  await saveState();
  render();
}

function stackBaseLeft(width) {
  const sw = window.screen.availWidth;
  return Math.max(0, Math.floor((sw - width) / 2));
}

async function loadSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  const s = data[SETTINGS_KEY];
  return { windowWidth: s?.windowWidth ?? DEFAULT_WIDTH };
}

async function onAddFeed() {
  const name = feedNameInput.value.trim();
  const urlRaw = feedUrlInput.value.trim();

  if (!name || !urlRaw) return;

  const normalizedUrl = normalizeHttpUrl(urlRaw);
  if (!normalizedUrl) return;

  if (state.feeds.some((f) => f.url === normalizedUrl)) return;

  state.feeds.push({ id: crypto.randomUUID(), name, url: normalizedUrl });
  await saveState();
  closeDialog();
  render();
}

function normalizeHttpUrl(input) {
  try {
    const candidate = input.match(/^https?:\/\//i) ? input : `https://${input}`;
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function ensureDayBucket(dateKey) {
  if (!state.completionByDate[dateKey]) state.completionByDate[dateKey] = {};
}


function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function loadState() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const s = data[STORAGE_KEY];
  if (!s || typeof s !== "object") return { feeds: [], completionByDate: {} };
  return {
    feeds: Array.isArray(s.feeds) ? s.feeds.filter(isValidFeed) : [],
    completionByDate: isObject(s.completionByDate) ? s.completionByDate : {}
  };
}

async function saveState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function isObject(v) { return v && typeof v === "object" && !Array.isArray(v); }

function isValidFeed(v) {
  return isObject(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.url === "string" &&
    Boolean(normalizeHttpUrl(v.url));
}
