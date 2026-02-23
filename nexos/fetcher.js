const crypto = require("crypto");
const puppeteer = require("puppeteer");
const { initDb, all, get, run, db } = require("./db");

const applyLens = (text, prompt) => {
  // TODO: Connect to LLM API here to summarize/filter based on the prompt.
  return text;
};

const hashItem = (title, url) =>
  crypto.createHash("md5").update(`${title}|${url}`).digest("hex");

const MAX_SUMMARY_LENGTH = 2000;

const fetchSourceItems = async (browser, source) => {
  const page = await browser.newPage();

  try {
    await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 45000 });

    const bodyText = await page.evaluate(() => (document.body ? document.body.innerText : ""));
    if (!bodyText) {
      return;
    }

    const summary = applyLens(bodyText, source.lens_prompt).trim();
    if (!summary) {
      return;
    }

    const clippedSummary =
      summary.length > MAX_SUMMARY_LENGTH
        ? `${summary.slice(0, MAX_SUMMARY_LENGTH)}...`
        : summary;

    const title = `${source.name} Briefing`;
    const itemHash = hashItem(title, source.url);
    const alreadySeen = await get("SELECT hash FROM memory WHERE hash = ?", [itemHash]);

    if (alreadySeen) {
      return;
    }

    await run(
      `INSERT INTO inbox (source_id, title, url, summary)
       VALUES (?, ?, ?, ?)` ,
      [source.id, title, source.url, clippedSummary]
    );

    await run("INSERT INTO memory (hash) VALUES (?)", [itemHash]);
  } finally {
    await page.close();
  }
};

const runFetcher = async () => {
  await initDb();

  const sources = await all("SELECT * FROM sources");
  if (!sources.length) {
    console.log("No sources configured. Run seed.js or add sources in settings.");
    db.close();
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    // Paste your Chrome user data dir to reuse your logged-in session.
    // Example (macOS): /Users/<you>/Library/Application Support/Google/Chrome
    // userDataDir: "/Users/<you>/Library/Application Support/Google/Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  for (const source of sources) {
    try {
      await fetchSourceItems(browser, source);
      console.log(`Fetched: ${source.name}`);
    } catch (err) {
      console.error(`Failed: ${source.name}`, err);
    }
  }

  await browser.close();
  db.close();
};

runFetcher().catch((err) => {
  console.error("Fetcher crashed:", err);
  db.close();
  process.exit(1);
});
