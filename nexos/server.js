const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const { initDb, all, get, run } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  try {
    await initDb();
    const rows = await all(
      `SELECT inbox.*, sources.name AS source_name
       FROM inbox
       JOIN sources ON sources.id = inbox.source_id
       ORDER BY inbox.created_at DESC`
    );

    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.source_name]) {
        acc[row.source_name] = [];
      }
      acc[row.source_name].push(row);
      return acc;
    }, {});

    res.render("index", { grouped });
  } catch (err) {
    res.status(500).send("Failed to load inbox.");
  }
});

app.get("/settings", async (req, res) => {
  try {
    await initDb();
    const sources = await all("SELECT * FROM sources ORDER BY name ASC");
    res.render("settings", { sources });
  } catch (err) {
    res.status(500).send("Failed to load settings.");
  }
});

app.post("/settings/add", async (req, res) => {
  const { name, url, selector, lens_prompt } = req.body;
  const selectorValue = selector && selector.trim() ? selector.trim() : "a";

  try {
    await run(
      `INSERT INTO sources (name, url, selector, lens_prompt)
       VALUES (?, ?, ?, ?)` ,
      [name, url, selectorValue, lens_prompt]
    );
    res.redirect("/settings");
  } catch (err) {
    res.status(400).send("Failed to add source.");
  }
});

app.post("/settings/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name, url, selector, lens_prompt } = req.body;
  let selectorValue = selector && selector.trim() ? selector.trim() : null;

  try {
    if (!selectorValue) {
      const existing = await get("SELECT selector FROM sources WHERE id = ?", [id]);
      selectorValue = existing && existing.selector ? existing.selector : "a";
    }

    await run(
      `UPDATE sources
       SET name = ?, url = ?, selector = ?, lens_prompt = ?
       WHERE id = ?` ,
      [name, url, selectorValue, lens_prompt, id]
    );
    res.redirect("/settings");
  } catch (err) {
    res.status(400).send("Failed to update source.");
  }
});

app.post("/settings/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await run("DELETE FROM sources WHERE id = ?", [id]);
    res.redirect("/settings");
  } catch (err) {
    res.status(400).send("Failed to delete source.");
  }
});

app.listen(PORT, () => {
  console.log(`Nexos running at http://localhost:${PORT}`);
});
