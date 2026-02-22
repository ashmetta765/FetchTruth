const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
const db = new Database("fetchtruth.db");

app.use(cors());
app.use(express.json());

// table for visited sites and whether they are trustworthy or not 
db.exec(`
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE,
        title TEXT,
        verdict TEXT,
        realScore TEXT,
        fakeScore TEXT,
        date TEXT
    )
`);

//table for user feedback
db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        title TEXT,
        verdict TEXT,
        opinion TEXT,
        comments TEXT,
        date TEXT
    )
`);

// 
app.get("/api/history", (req, res) => {
    const rows = db.prepare("SELECT * FROM history ORDER BY id DESC").all();
    res.json(rows);
});

//
app.post("/api/entry", (req, res) => {
    const { url, title, verdict, realScore, fakeScore, date } = req.body;
    const existing = db.prepare("SELECT * FROM history WHERE url = ?").get(url);
    if (existing) {
        return res.json({ duplicate: true, entry: existing });
    }
    db.prepare(`
        INSERT INTO history (url, title, verdict, realScore, fakeScore, date)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(url, title, verdict, realScore, fakeScore, date);
    res.json({ duplicate: false });
});

app.delete("/api/history", (req, res) => {
    db.prepare("DELETE FROM history").run();
    res.json({ success: true });
});

app.get("/api/feedback", (req, res) => {
    const rows = db.prepare("SELECT * FROM feedback ORDER BY id DESC").all();
    res.json(rows);
});

app.post("/api/feedback", (req, res) => {
    const { url, title, verdict, opinion, comments, date } = req.body;
    db.prepare(`
        INSERT INTO feedback (url, title, verdict, opinion, comments, date)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(url, title, verdict, opinion, comments, date);
    res.json({ success: true });
});

app.delete("/api/feedback", (req, res) => {
    db.prepare("DELETE FROM feedback").run();
    res.json({ success: true });
});

app.listen(3000, () => console.log("FetchTruth server running on http://localhost:3000"));