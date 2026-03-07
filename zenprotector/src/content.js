import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// ── Clean up any previous scan ──────────────────────────────────────────────
document.querySelectorAll('.zenprotector-highlight').forEach(el => {
  el.replaceWith(document.createTextNode(el.textContent));
});

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

// ── Walk DOM and highlight matched words ──────────────────────────────────────
function processTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!/[a-zA-Z]/.test(text)) return;

  const parts = text.split(/(\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b)/g);
  if (parts.length <= 1) return;

  let hasMatch = false;
  const fragment = document.createDocumentFragment();

  for (const part of parts) {
    const lower = part.toLowerCase();

    if (negativeSet.has(lower)) {
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
    } else if (positiveSet.has(lower)) {
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
  const children = Array.from(node.childNodes);
  for (const child of children) walkNode(child);
}

walkNode(document.body);

// Count actual highlighted spans — ground truth that matches what the user sees
const negCount = document.querySelectorAll('.zenprotector-negative').length;
const posCount = document.querySelectorAll('.zenprotector-positive').length;

// Compute score from only the highlighted words' AFINN values so the
// comparative isn't diluted by thousands of nav/sidebar/footer tokens.
// result.calculation is an array of { word: afinnValue } objects.
let highlightedScore = 0;
for (const entry of (result.calculation || [])) {
  const [word, val] = Object.entries(entry)[0];
  if (negativeSet.has(word) || positiveSet.has(word)) {
    highlightedScore += val;
  }
}
// Divide by total sentiment-bearing words (avg AFINN score per sentiment word)
const comparative = highlightedScore / (negCount + posCount || 1);

// Store on window so popup.js can retrieve it via a second executeScript call
window.__zenprotectorResult = {
  negCount,
  posCount,
  totalWords: result.tokens.length,
  score: highlightedScore,
  comparative,
};
