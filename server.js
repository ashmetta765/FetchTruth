const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
const db = new Database("fetchtruth.db");

app.use(cors());
app.use(express.json());

db.exec(`
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE,
        title TEXT,
        verdict TEXT,
        realScore TEXT,
        fakeScore TEXT,
        date TEXT,
        feedback TEXT
    )
`);

app.get("/api/history", (req, res) => {
    const rows = db.prepare("SELECT * FROM history ORDER BY id DESC").all();
    res.json(rows);
});

app.post("/api/entry", (req, res) => {
    const { url, title, verdict, realScore, fakeScore, date } = req.body;
    const existing = db.prepare("SELECT * FROM history WHERE url = ?").get(url);
    if (existing) {
        return res.json({ duplicate: true, entry: existing });
    }
    db.prepare(`
        INSERT INTO history (url, title, verdict, realScore, fakeScore, date, feedback)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
    `).run(url, title, verdict, realScore, fakeScore, date);
    res.json({ duplicate: false });
});

// Save feedback for a specific entry
app.post("/api/feedback", (req, res) => {
    const { url, feedback } = req.body;
    db.prepare("UPDATE history SET feedback = ? WHERE url = ?").run(feedback, url);
    res.json({ success: true });
});

app.delete("/api/history", (req, res) => {
    db.prepare("DELETE FROM history").run();
    res.json({ success: true });
});

app.listen(3000, () => console.log("FetchTruth server running on http://127.0.0.1:3000"));