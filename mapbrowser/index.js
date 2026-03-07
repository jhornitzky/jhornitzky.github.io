const goalForm = document.getElementById("goal-form");
const goalInput = document.getElementById("goal-input");
const aiAnswerEl = document.getElementById("ai-answer");
const hallwayListEl = document.getElementById("hallway-list");
const hallwayItemTemplate = document.getElementById("hallway-item-template");
const mapCanvas = document.getElementById("map-canvas");
const mapShell = document.getElementById("map-shell");

const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const resetViewButton = document.getElementById("reset-view");

const stagePrompts = [
  "overview",
  "historical background",
  "key events and timeline",
  "major people and ideas",
  "critical debates",
  "current relevance"
];

const state = {
  hallway: [],
  mapNodes: [],
  mapLinks: [],
  scale: 1,
  offsetX: 100,
  offsetY: 60,
  activeNodeId: null,
  dragStart: null,
  hasExpanded: new Set(),
  collapsedNodes: new Set(),
  loadingNodes: new Set()
};

const NODE_WIDTH = 210;
const NODE_HEIGHT = 132;
const ROOT_Y = 150;
const LEVEL_GAP = 240;
const SLOT_GAP = 280;
const MAX_DEPTH = 4;

const api = {
  search: (query, limit = 5) =>
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`,
  summary: (title) =>
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  links: (title) =>
    `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=links&format=json&origin=*`
};

goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const goal = goalInput.value.trim();
  if (!goal) {
    return;
  }

  setBusyUI(true);
  aiAnswerEl.classList.add("muted");
  aiAnswerEl.textContent = "Building your goal hallway and synthesizing answer...";
  hallwayListEl.innerHTML = "";

  try {
    const hallway = await buildHallway(goal);
    state.hallway = hallway;
    state.hasExpanded.clear();
    state.collapsedNodes.clear();
    state.loadingNodes.clear();
    renderHallway(hallway);
    initializeHallwayMap(hallway);

    try {
      const synthesis = await synthesizeAnswer(goal, hallway);
      aiAnswerEl.classList.remove("muted");
      aiAnswerEl.innerHTML = synthesis;
    } catch {
      aiAnswerEl.classList.remove("muted");
      aiAnswerEl.textContent = "Hallway built. AI summary is temporarily unavailable, but you can explore the map now.";
    }
  } catch (error) {
    aiAnswerEl.textContent = "Could not build hallway right now. Please try another goal.";
    aiAnswerEl.classList.add("muted");
  } finally {
    setBusyUI(false);
  }
});

zoomInButton.addEventListener("click", () => {
  state.scale = Math.min(2.2, state.scale + 0.15);
  renderMap();
});

zoomOutButton.addEventListener("click", () => {
  state.scale = Math.max(0.45, state.scale - 0.15);
  renderMap();
});

resetViewButton.addEventListener("click", () => {
  state.scale = 1;
  state.offsetX = 100;
  state.offsetY = 60;
  renderMap();
});

mapShell.addEventListener("mousedown", (event) => {
  if (event.target.closest(".map-node")) {
    return;
  }
  state.dragStart = {
    x: event.clientX,
    y: event.clientY,
    originX: state.offsetX,
    originY: state.offsetY
  };
});

window.addEventListener("mousemove", (event) => {
  if (!state.dragStart) {
    return;
  }
  const dx = event.clientX - state.dragStart.x;
  const dy = event.clientY - state.dragStart.y;
  state.offsetX = state.dragStart.originX + dx;
  state.offsetY = state.dragStart.originY + dy;
  renderMap();
});

window.addEventListener("mouseup", () => {
  state.dragStart = null;
});

mapShell.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  state.scale = Math.min(2.2, Math.max(0.45, state.scale + delta));
  renderMap();
}, { passive: false });

async function buildHallway(goal) {
  const requests = stagePrompts.map((stage) =>
    fetch(api.search(`${goal} ${stage}`, 3))
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
  );

  const results = await Promise.all(requests);
  const unique = new Set();
  const hallway = [];

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (!result) {
      continue;
    }

    const candidates = parseSearchCandidates(result);
    if (!candidates.length) {
      continue;
    }

    for (let c = 0; c < candidates.length; c += 1) {
      const candidate = candidates[c];
      if (unique.has(candidate.title)) {
        continue;
      }

      unique.add(candidate.title);
      hallway.push({
        id: `hall-${hallway.length + 1}`,
        stage: stagePrompts[i],
        title: candidate.title,
        description: candidate.description,
        url: candidate.url
      });

      break;
    }
  }

  if (hallway.length < 5) {
    const fallback = await fetchFallbackHallway(goal, unique);
    hallway.push(...fallback);
  }

  if (!hallway.length) {
    return buildSyntheticHallway(goal);
  }

  return hallway.slice(0, 6);
}

async function synthesizeAnswer(goal, hallway) {
  const top = hallway.slice(0, 3);
  const summaries = await Promise.all(
    top.map(async (item) => {
      try {
        const response = await fetch(api.summary(item.title));
        if (!response.ok) {
          return `${item.title}: No summary available.`;
        }
        const data = await response.json();
        return `${item.title}: ${data.extract || "No summary available."}`;
      } catch {
        return `${item.title}: No summary available.`;
      }
    })
  );

  const intro = `<p><strong>Goal:</strong> ${escapeHTML(goal)}</p>`;
  const bullets = summaries
    .map((entry) => `<li>${escapeHTML(entry)}</li>`)
    .join("");

  return `${intro}<p>This pathway gives you a sequenced understanding before deeper exploration:</p><ul>${bullets}</ul>`;
}

function renderHallway(hallway) {
  hallwayListEl.innerHTML = "";

  hallway.forEach((item) => {
    const fragment = hallwayItemTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".hallway-link");
    button.textContent = `${capitalize(item.stage)} → ${item.title}`;

    button.addEventListener("click", () => {
      focusNode(item.id);
      expandNode(item.id);
    });

    hallwayListEl.appendChild(fragment);
  });
}

function initializeHallwayMap(hallway) {
  state.mapNodes = hallway.map((item, index) => ({
    id: item.id,
    parentId: null,
    x: 180 + index * SLOT_GAP,
    y: ROOT_Y,
    title: item.title,
    summary: item.description,
    stage: item.stage,
    url: item.url,
    sourceTitle: item.title,
    depth: 0
  }));

  state.mapLinks = [];
  for (let i = 0; i < state.mapNodes.length - 1; i += 1) {
    state.mapLinks.push({ from: state.mapNodes[i].id, to: state.mapNodes[i + 1].id });
  }

  state.activeNodeId = state.mapNodes[0]?.id || null;
  state.scale = 1;
  state.offsetX = 100;
  state.offsetY = 60;
  renderMap();

  hydrateNodeSummaries(state.mapNodes.map((node) => node.id));
}

function renderMap() {
  updateCanvasBounds();
  mapCanvas.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
  mapCanvas.innerHTML = "";

  const visibleNodes = state.mapNodes.filter((node) => isNodeVisible(node));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));

  state.mapLinks.forEach((link) => {
    if (!visibleIds.has(link.from) || !visibleIds.has(link.to)) {
      return;
    }

    const fromNode = state.mapNodes.find((node) => node.id === link.from);
    const toNode = state.mapNodes.find((node) => node.id === link.to);
    if (!fromNode || !toNode) {
      return;
    }

    const line = document.createElement("div");
    line.className = "map-link";

    const x1 = fromNode.x + NODE_WIDTH / 2;
    const y1 = fromNode.y + 90;
    const x2 = toNode.x + NODE_WIDTH / 2;
    const y2 = toNode.y + 18;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    line.style.left = `${x1}px`;
    line.style.top = `${y1}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
    line.style.transition = "left 220ms ease, top 220ms ease, width 220ms ease, transform 220ms ease";

    mapCanvas.appendChild(line);
  });

  visibleNodes.forEach((node) => {
    const element = document.createElement("article");
    element.className = "map-node";
    if (node.id === state.activeNodeId) {
      element.classList.add("active");
    }

    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.style.transition = "left 220ms ease, top 220ms ease, border-color 160ms ease";

    const title = document.createElement("h3");
    title.textContent = node.depth === 0
      ? `${capitalize(node.stage)}: ${node.title}`
      : node.title;

    const summary = document.createElement("p");
    summary.textContent = node.summary;

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "open";
    openButton.textContent = "Open Source";
    openButton.addEventListener("click", (event) => {
      event.stopPropagation();
      window.open(node.url, "_blank", "noopener,noreferrer");
    });

    const hasChildren = state.mapNodes.some((item) => item.parentId === node.id);
    const branchButton = document.createElement("button");
    branchButton.type = "button";
    branchButton.className = "open";
    branchButton.textContent = state.collapsedNodes.has(node.id)
      ? "Show Children"
      : "Hide Children";
    branchButton.disabled = !hasChildren;
    branchButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleNodeBranch(node.id);
    });

    const isLoading = state.loadingNodes.has(node.id);
    if (isLoading) {
      const loading = document.createElement("div");
      loading.className = "node-loading";
      loading.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Loading children...</span>';
      element.append(loading);
    }

    element.append(title, summary, openButton, branchButton);

    element.addEventListener("click", () => {
      focusNode(node.id);
      expandNode(node.id);
    });

    mapCanvas.appendChild(element);
  });
}

function focusNode(nodeId) {
  state.activeNodeId = nodeId;
  centerNodeInView(nodeId);
  hydrateNodeSummaries([nodeId]);
  renderMap();
}

async function expandNode(nodeId) {
  const node = state.mapNodes.find((item) => item.id === nodeId);
  if (!node || state.loadingNodes.has(nodeId) || state.hasExpanded.has(nodeId) || node.depth >= MAX_DEPTH) {
    return;
  }

  try {
    state.loadingNodes.add(nodeId);
    renderMap();

    const links = await fetchNextLinks(node.sourceTitle);
    const picked = links.slice(0, 5);
    const enriched = await enrichLinksWithSummary(picked);
    if (!enriched.length) {
      return;
    }

    const existingTitles = new Set(
      state.mapNodes
        .filter((item) => item.parentId === node.id)
        .map((item) => item.title.toLowerCase())
    );

    let inserted = 0;

    enriched.forEach((link, index) => {
      if (existingTitles.has(link.title.toLowerCase())) {
        return;
      }

      const childId = `${node.id}-child-${index}`;
      const childNode = {
        id: childId,
        parentId: node.id,
        x: node.x,
        y: ROOT_Y + (node.depth + 1) * LEVEL_GAP,
        title: link.title,
        summary: link.summary,
        stage: "related",
        url: link.url,
        sourceTitle: link.title,
        depth: node.depth + 1
      };

      state.mapNodes.push(childNode);
      state.mapLinks.push({ from: node.id, to: childId });
      inserted += 1;
    });

    if (!inserted) {
      return;
    }

    state.hasExpanded.add(nodeId);

    relayoutTree();
    centerNodeInView(nodeId);
    renderMap();
  } catch (error) {
    state.hasExpanded.delete(nodeId);
  } finally {
    state.loadingNodes.delete(nodeId);
    renderMap();
  }
}

async function fetchNextLinks(title) {
  try {
    const response = await fetch(api.links(title));
    if (!response.ok) {
      throw new Error("Failed loading links");
    }

    const data = await response.json();
    const links = data?.parse?.links || [];
    const filtered = links
      .filter((item) => item.ns === 0)
      .filter((item) => item.exists !== "")
      .filter((item) => !item["*"]?.includes(":"))
      .map((item) => ({
        title: item["*"],
        description: `Linked from ${title}`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item["*"].replace(/\s+/g, "_"))}`
      }));

    const unique = dedupeByTitle(filtered).slice(0, 12);
    if (unique.length) {
      return unique;
    }
  } catch {
    // Fall through to search-based fallback.
  }

  return fetchRelatedBySearch(title);
}

async function fetchFallbackHallway(goal, uniqueTitles) {
  const fallbackQueries = [
    `${goal} introduction`,
    `${goal} timeline`,
    `${goal} key figures`,
    `${goal} concepts`,
    `${goal} examples`,
    `${goal} modern impact`,
    `${goal} overview encyclopedia`
  ];

  const results = await Promise.all(
    fallbackQueries.map((query) =>
      fetch(api.search(query, 5))
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)
    )
  );

  const hallway = [];

  results.forEach((result, index) => {
    if (!result) {
      return;
    }

    const candidates = parseSearchCandidates(result);
    if (!candidates.length) {
      return;
    }

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (!candidate.title || uniqueTitles.has(candidate.title)) {
        continue;
      }

      uniqueTitles.add(candidate.title);
      hallway.push({
        id: `hall-fallback-${index}-${i}`,
        stage: `explore ${index + 1}`,
        title: candidate.title,
        description: candidate.description,
        url: candidate.url
      });

      if (hallway.length >= 6) {
        return;
      }
    }
  });

  return hallway;
}

function parseSearchCandidates(result) {
  const entries = result?.query?.search || [];

  return entries.map((entry) => {
    const title = entry.title;
    const snippet = entry.snippet
      ? entry.snippet.replace(/<[^>]*>/g, "")
      : "Wikipedia search result";

    return {
      title,
      description: snippet,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`
    };
  });
}

async function enrichLinksWithSummary(links) {
  return Promise.all(
    links.map(async (link) => {
      const summary = await fetchSummaryText(link.title);
      return {
        ...link,
        summary: summary || link.description
      };
    })
  );
}

async function hydrateNodeSummaries(nodeIds) {
  const updates = await Promise.all(
    nodeIds.map(async (nodeId) => {
      const node = state.mapNodes.find((item) => item.id === nodeId);
      if (!node) {
        return false;
      }

      const summary = await fetchSummaryText(node.sourceTitle);
      if (!summary) {
        return false;
      }

      node.summary = summary;
      return true;
    })
  );

  if (updates.some(Boolean)) {
    renderMap();
  }
}

async function fetchSummaryText(title) {
  try {
    const response = await fetch(api.summary(title));
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data?.extract) {
      return null;
    }

    return data.extract.length > 240 ? `${data.extract.slice(0, 237)}...` : data.extract;
  } catch {
    return null;
  }
}

async function fetchRelatedBySearch(title) {
  try {
    const response = await fetch(api.search(`${title} related`, 8));
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return parseSearchCandidates(data)
      .filter((item) => item.title.toLowerCase() !== title.toLowerCase())
      .slice(0, 8)
      .map((item) => ({
        title: item.title,
        description: `Related to ${title}`,
        url: item.url
      }));
  } catch {
    return [];
  }
}

function centerNodeInView(nodeId) {
  const node = state.mapNodes.find((item) => item.id === nodeId);
  if (!node) {
    return;
  }

  const shellWidth = mapShell.clientWidth;
  const shellHeight = mapShell.clientHeight;
  const nodeCenterX = node.x + NODE_WIDTH / 2;
  const nodeCenterY = node.y + NODE_HEIGHT / 2;

  state.offsetX = shellWidth / 2 - nodeCenterX * state.scale;
  state.offsetY = shellHeight / 2 - nodeCenterY * state.scale;
}

function updateCanvasBounds() {
  if (!state.mapNodes.length) {
    mapCanvas.style.width = "2200px";
    mapCanvas.style.height = "1400px";
    return;
  }

  const minX = Math.min(...state.mapNodes.map((node) => node.x));
  if (minX < 120) {
    const shift = 120 - minX;
    state.mapNodes.forEach((node) => {
      node.x += shift;
    });
  }

  const maxX = Math.max(...state.mapNodes.map((node) => node.x));
  const maxY = Math.max(...state.mapNodes.map((node) => node.y));

  mapCanvas.style.width = `${Math.max(2200, maxX + NODE_WIDTH + 320)}px`;
  mapCanvas.style.height = `${Math.max(1400, maxY + NODE_HEIGHT + 320)}px`;
}

function relayoutTree() {
  const roots = state.mapNodes
    .filter((node) => node.depth === 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  roots.forEach((node, index) => {
    node.x = 180 + index * SLOT_GAP;
    node.y = ROOT_Y;
  });

  const occupiedByDepth = new Map();
  occupiedByDepth.set(0, roots.map((node) => node.x));

  for (let depth = 1; depth <= MAX_DEPTH; depth += 1) {
    const parents = state.mapNodes
      .filter((node) => node.depth === depth - 1)
      .sort((a, b) => a.x - b.x);

    const occupied = occupiedByDepth.get(depth) || [];

    parents.forEach((parent) => {
      const children = state.mapNodes
        .filter((node) => node.parentId === parent.id)
        .sort((a, b) => a.id.localeCompare(b.id));

      if (!children.length) {
        return;
      }

      const midpoint = (children.length - 1) / 2;
      children.forEach((child, index) => {
        const preferredX = parent.x + (index - midpoint) * SLOT_GAP;
        const x = findNearestFreeX(occupied, preferredX);

        child.x = x;
        child.y = ROOT_Y + depth * LEVEL_GAP;
        occupied.push(x);
      });
    });

    occupiedByDepth.set(depth, occupied);
  }
}

function findNearestFreeX(occupied, preferredX) {
  if (!occupied.length) {
    return preferredX;
  }

  const minGap = NODE_WIDTH + 26;
  const isFree = (candidateX) =>
    occupied.every((x) => Math.abs(x - candidateX) >= minGap);

  if (isFree(preferredX)) {
    return preferredX;
  }

  for (let step = 1; step <= 40; step += 1) {
    const right = preferredX + step * SLOT_GAP;
    if (isFree(right)) {
      return right;
    }

    const left = preferredX - step * SLOT_GAP;
    if (isFree(left)) {
      return left;
    }
  }

  return preferredX + (occupied.length + 1) * SLOT_GAP;
}

function toggleNodeBranch(nodeId) {
  if (state.collapsedNodes.has(nodeId)) {
    state.collapsedNodes.delete(nodeId);
  } else {
    state.collapsedNodes.add(nodeId);
  }
  renderMap();
}

function isNodeVisible(node) {
  let current = node;
  while (current.parentId) {
    if (state.collapsedNodes.has(current.parentId)) {
      return false;
    }
    current = state.mapNodes.find((item) => item.id === current.parentId);
    if (!current) {
      break;
    }
  }
  return true;
}

function buildSyntheticHallway(goal) {
  const cleanedGoal = sanitizeGoal(goal);
  return stagePrompts.map((stage, index) => {
    const query = `${cleanedGoal} ${stage}`.trim();
    return {
      id: `hall-synthetic-${index + 1}`,
      stage,
      title: `${capitalize(stage)} for ${cleanedGoal}`,
      description: `Fallback pathway generated for: ${query}`,
      url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`
    };
  });
}

function sanitizeGoal(goal) {
  const lowered = goal
    .replace(/^i\s+want\s+to\s+/i, "")
    .replace(/^help\s+me\s+/i, "")
    .replace(/^i\s+need\s+to\s+/i, "")
    .replace(/^can\s+you\s+/i, "")
    .trim();

  return lowered || goal.trim();
}

function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.title)) {
      return false;
    }
    seen.add(item.title);
    return true;
  });
}

function setBusyUI(isBusy) {
  const submitButton = goalForm.querySelector('button[type="submit"]');
  submitButton.disabled = isBusy;
  goalInput.disabled = isBusy;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
