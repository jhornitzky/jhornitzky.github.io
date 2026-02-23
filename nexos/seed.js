const { initDb, run, db } = require("./db");

const seedSources = async () => {
  await initDb();

  const sources = [
    {
      name: "Hacker News",
      url: "https://news.ycombinator.com",
      selector: ".titleline > a",
      lensPrompt: "Tech news only"
    },
    {
      name: "Reddit (WebDev)",
      url: "https://old.reddit.com/r/webdev",
      selector: "a.title",
      lensPrompt: "New frameworks"
    }
  ];

  for (const source of sources) {
    await run(
      `INSERT OR IGNORE INTO sources (name, url, selector, lens_prompt)
       VALUES (?, ?, ?, ?)` ,
      [source.name, source.url, source.selector, source.lensPrompt]
    );
  }

  db.close();
};

seedSources().catch((err) => {
  console.error("Seed failed:", err);
  db.close();
  process.exit(1);
});
