const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
const db = new Database("fetchtruth.db");

app.use(cors());
app.use(express.json());

// Create table if it doesn't exist
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

// Get all history
app.get("/api/history", (req, res) => {
    const rows = db.prepare("SELECT * FROM history ORDER BY id DESC").all();
    res.json(rows);
});

// Add or check entry
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

// Clear history
app.delete("/api/history", (req, res) => {
    db.prepare("DELETE FROM history").run();
    res.json({ success: true });
});

// View database in browser
app.get("/", (req, res) => {
    const rows = db.prepare("SELECT * FROM history ORDER BY id DESC").all();
    const html = `
        <html>
        <head>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
                th { background-color: #2eccb6; color: white; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .real { color: green; }
                .fake { color: red; }
            </style>
        </head>
        <body>
            <h2>FetchTruth Database (${rows.length} entries)</h2>
            <table>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Verdict</th>
                    <th>Real %</th>
                    <th>Fake %</th>
                    <th>Date</th>
                    <th>URL</th>
                </tr>
                ${rows.map(r => `
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.title}</td>
                        <td class="${r.verdict}">${r.verdict === 'real' ? '🟢 Real' : '🔴 Fake'}</td>
                        <td>${r.realScore}%</td>
                        <td>${r.fakeScore}%</td>
                        <td>${r.date}</td>
                        <td><a href="${r.url}" target="_blank">Link</a></td>
                    </tr>
                `).join("")}
            </table>
        </body>
        </html>
    `;
    res.send(html);
});

app.listen(3000, () => console.log("FetchTruth server running on http://localhost:3000"));