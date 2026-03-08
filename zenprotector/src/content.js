import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// ── Clean up any previous scan ──────────────────────────────────────────────
document.querySelectorAll('.zenprotector-highlight').forEach(el => {
  el.replaceWith(document.createTextNode(el.textContent));
});

// Disconnect any previous observer before re-scanning
if (window.__zenprotectorObserver) {
  window.__zenprotectorObserver.disconnect();
  window.__zenprotectorObserver = null;
}

// ── Collect all visible text and analyse once ────────────────────────────────
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT',
  'SELECT', 'IFRAME', 'SVG', 'CANVAS', 'CODE', 'PRE'
]);

function collectText(node, parts) {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.nodeValue);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (SKIP_TAGS.has(node.tagName)) return;
  if (node.isContentEditable) return;
  for (const child of node.childNodes) collectText(child, parts);
}

const textParts = [];
collectText(document.body, textParts);
const fullText = textParts.join(' ');

const result = sentiment.analyze(fullText);
const negativeSet = new Set(result.negative);
const positiveSet = new Set(result.positive);

// Expose sets on window so the MutationObserver closure can use them
// even after esbuild's IIFE has finished executing
window.__zenprotectorSets = { negativeSet, positiveSet };

// ── Highlight a single text node ─────────────────────────────────────────────
function processTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!/[a-zA-Z]/.test(text)) return;

  const parts = text.split(/(\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b)/g);
  if (parts.length <= 1) return;

  let hasMatch = false;
  const fragment = document.createDocumentFragment();

  for (const part of parts) {
    const lower = part.toLowerCase();

    if (window.__zenprotectorSets.negativeSet.has(lower)) {
      hasMatch = true;
      const span = document.createElement('span');
      span.className = 'zenprotector-highlight zenprotector-negative';
      span.textContent = part;
      span.style.cssText = `
        background-color: rgba(239,68,68,0.25) !important;
        color: #ff6b6b !important;
        border-radius: 2px !important;
        padding: 0 1px !important;
        text-decoration: underline !important;
        text-decoration-color: rgba(239,68,68,0.6) !important;
        text-underline-offset: 2px !important;
        cursor: help !important;
      `;
      span.title = 'Negative sentiment';
      fragment.appendChild(span);
    } else if (window.__zenprotectorSets.positiveSet.has(lower)) {
      hasMatch = true;
      const span = document.createElement('span');
      span.className = 'zenprotector-highlight zenprotector-positive';
      span.textContent = part;
      span.style.cssText = `
        background-color: rgba(74,222,128,0.15) !important;
        color: #4ade80 !important;
        border-radius: 2px !important;
        padding: 0 1px !important;
        cursor: help !important;
      `;
      span.title = 'Positive sentiment';
      fragment.appendChild(span);
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }

  if (hasMatch) {
    textNode.parentNode.replaceChild(fragment, textNode);
  }
}

function walkNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (SKIP_TAGS.has(node.tagName)) return;
  if (node.isContentEditable) return;
  // Skip nodes already processed
  if (node.classList && node.classList.contains('zenprotector-highlight')) return;
  const children = Array.from(node.childNodes);
  for (const child of children) walkNode(child);
}

walkNode(document.body);

// ── Compute results ───────────────────────────────────────────────────────────
function computeResult() {
  const negCount = document.querySelectorAll('.zenprotector-negative').length;
  const posCount = document.querySelectorAll('.zenprotector-positive').length;

  let highlightedScore = 0;
  for (const entry of (result.calculation || [])) {
    const [word, val] = Object.entries(entry)[0];
    if (negativeSet.has(word) || positiveSet.has(word)) {
      highlightedScore += val;
    }
  }
  const comparative = highlightedScore / (negCount + posCount || 1);

  return { negCount, posCount, totalWords: result.tokens.length, score: highlightedScore, comparative };
}

window.__zenprotectorResult = computeResult();

// ── MutationObserver for infinite scroll (auto-scan mode only) ────────────────
chrome.storage.local.get('zenprotectorAutoScan', ({ zenprotectorAutoScan }) => {
  if (!zenprotectorAutoScan) return;

  let debounceTimer;

  const observer = new MutationObserver((mutations) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      let hadNewNodes = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          // Skip highlight spans we injected, and non-element/text nodes
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && node.classList.contains('zenprotector-highlight')) continue;
            walkNode(node);
            hadNewNodes = true;
          }
        }
      }

      if (!hadNewNodes) return;

      // Update stored result and notify background to refresh badge
      window.__zenprotectorResult = computeResult();

      const { comparative } = window.__zenprotectorResult;
      const key = `zenprotector:${location.origin}${location.pathname}`;
      chrome.storage.local.set({
        [key]: { ...window.__zenprotectorResult, scannedAt: Date.now(), url: location.href }
      });
      chrome.runtime.sendMessage({ type: 'updateBadge', comparative });
    }, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.__zenprotectorObserver = observer;
});
