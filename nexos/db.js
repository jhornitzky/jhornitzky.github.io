const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = path.join(__dirname, "nexos.sqlite");
const db = new sqlite3.Database(DB_PATH);

const initDb = () =>
  new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          selector TEXT NOT NULL,
          lens_prompt TEXT NOT NULL
        )`,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
        }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS inbox (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          summary TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (source_id) REFERENCES sources(id)
        )`,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
        }
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS memory (
          hash TEXT PRIMARY KEY,
          seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });

module.exports = {
  db,
  initDb,
  run,
  get,
  all
};
