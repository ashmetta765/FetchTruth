const SERVER = "http://127.0.0.1:3000";
let allData = [];

async function loadData() {
    const res = await fetch(`${SERVER}/api/history`);
    allData = await res.json();
    renderTable(allData);
    updateStats(allData);
    document.getElementById("last-updated").textContent = "Last updated: " + new Date().toLocaleTimeString();
}

function updateStats(data) {
    document.getElementById("total-count").textContent = data.length;
    document.getElementById("real-count").textContent = data.filter(r => r.verdict === "real").length;
    document.getElementById("fake-count").textContent = data.filter(r => r.verdict === "unverified").length;
}

function renderTable(data) {
    const tbody = document.getElementById("table-body");
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="no-data">No entries yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${r.title}</td>
            <td><span class="badge ${r.verdict === 'real' ? 'real' : 'unverified'}">${r.verdict === 'real' ? '🟢 Verified' : '🔴 Unverified'}</span></td>
            <td>${r.realScore}%</td>
            <td>${r.fakeScore}%</td>
            <td>${r.date}</td>
            <td><a href="${r.url}" target="_blank" class="url-link">Link</a></td>
            <td>${r.feedback ? r.feedback : '<span style="color:#bbb; font-size:12px;">No feedback yet</span>'}</td>
        </tr>
    `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("search").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allData.filter(r =>
            r.title.toLowerCase().includes(query) ||
            r.url.toLowerCase().includes(query)
        );
        renderTable(filtered);
        updateStats(filtered);
    });

    document.getElementById("clear-btn").addEventListener("click", async () => {
        if (!confirm("Are you sure you want to clear all history?")) return;
        await fetch(`${SERVER}/api/history`, { method: "DELETE" });
        loadData();
    });

    document.getElementById("refresh-btn").addEventListener("click", loadData);

    loadData();
});