const SERVER = "http://127.0.0.1:3000";

document.addEventListener("DOMContentLoaded", () => {
    function renderHistory(history) {
        const historyResults = document.getElementById("history-results");

        if (history.length === 0) {
            historyResults.innerHTML = "<p style='font-size: 13px; color: #888;'>No history yet.</p>";
            return;
        }

        historyResults.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 13px;">History (${history.length} articles)</strong>
                <button id="clear-history" style="background:none; border:none; color:red; cursor:pointer; font-size: 12px; font-family: 'Poppins', sans-serif;">Clear</button>
            </div>
            ${history.map(entry => `
                <div id="entry-${encodeURIComponent(entry.url)}" style="padding: 8px; border: 2px solid ${entry.verdict === 'real' ? '#2eccb6' : '#e74c3c'}; border-radius: 6px; margin-top: 6px; font-size: 12px; text-align: left; background-color: ${entry.highlighted ? '#FFD700' : 'white'};">
                    ${entry.highlighted ? '<small style="color: red; font-weight: bold;">⚠️ Already verified!</small><br>' : ''}
                    <strong>${entry.verdict === 'real' ? '🟢 Real' : '🔴 Fake'}</strong> — ${entry.date}<br>
                    <a href="${entry.url}" target="_blank" style="color: #555; word-break: break-all;">${entry.title}</a><br>
                    <small>🟢 ${entry.realScore}% | 🔴 ${entry.fakeScore}%</small>
                </div>
            `).join("")}
        `;

        document.getElementById("clear-history").addEventListener("click", async () => {
            await fetch(`${SERVER}/api/history`, { method: "DELETE" });
            historyResults.innerHTML = "<p style='font-size: 13px; color: #888;'>History cleared.</p>";
        });
    }

    document.getElementById("test-dataset").addEventListener("click", async () => {
        document.getElementById("test-results").innerHTML = "Analyzing...";

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tab.url;

            if (currentUrl.startsWith("chrome://") || currentUrl.startsWith("chrome-extension://")) {
                document.getElementById("test-results").innerHTML = "❌ Please navigate to a news article first.";
                return;
            }

            const [{ result: title }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const selectors = [
                        'h1',
                        '[class*="headline"]',
                        '[class*="title"]',
                        'meta[property="og:title"]'
                    ];
                    for (const selector of selectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            return el.tagName === 'META' ? el.getAttribute('content') : el.innerText.trim();
                        }
                    }
                    return document.title;
                }
            });

            if (!title) {
                document.getElementById("test-results").innerHTML = "❌ Could not find an article title on this page.";
                return;
            }

            const response = await fetch(
                "https://router.huggingface.co/hf-inference/models/XSY/albert-base-v2-fakenews-discriminator",
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer key"
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: title })
                }
            );

            const data = await response.json();

            if (data.error) {
                document.getElementById("test-results").innerHTML = `⚠️ Model error: ${data.error}`;
                return;
            }

            if (!Array.isArray(data) || !data[0]) {
                document.getElementById("test-results").innerHTML = `⚠️ Unexpected response format.`;
                return;
            }

            const labels = data[0];
            const fakeScore = labels.find(l => l.label === "LABEL_0")?.score ?? 0;
            const realScore = labels.find(l => l.label === "LABEL_1")?.score ?? 0;

            const isReal = realScore > fakeScore;
            const confidence = (Math.max(realScore, fakeScore) * 100).toFixed(1);
            const verdict = isReal ? "🟢 Real" : "🔴 Fake";
            const color = isReal ? "#2eccb6" : "#e74c3c";

            const saveResponse = await fetch(`${SERVER}/api/entry`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: currentUrl,
                    title,
                    verdict: isReal ? "real" : "fake",
                    realScore: (realScore * 100).toFixed(1),
                    fakeScore: (fakeScore * 100).toFixed(1),
                    date: new Date().toLocaleString()
                })
            });

            const saveData = await saveResponse.json();

            if (saveData.duplicate) {
                const historyRes = await fetch(`${SERVER}/api/history`);
                const history = await historyRes.json();

                const highlightedHistory = history.map(entry => ({
                    ...entry,
                    highlighted: entry.url === currentUrl
                }));

                document.getElementById("test-results").innerHTML = "";
                document.getElementById("main-view").style.display = "none";
                document.getElementById("history-view").style.display = "block";
                renderHistory(highlightedHistory);

                const entryEl = document.getElementById("entry-" + encodeURIComponent(currentUrl));
                if (entryEl) entryEl.scrollIntoView({ behavior: "smooth", block: "center" });

                setTimeout(() => {
                    if (entryEl) {
                        entryEl.style.backgroundColor = "white";
                        entryEl.querySelector("small[style*='color: red']")?.remove();
                    }
                }, 3000);

            } else {
                document.getElementById("test-results").innerHTML = `
                    <div style="padding: 10px; border: 2px solid ${color}; border-radius: 6px; margin-top: 10px;">
                        <small><strong>Title:</strong> ${title}</small><br><br>
                        <strong style="color: ${color}; font-size: 18px;">${verdict}</strong><br>
                        <span>Confidence: ${confidence}%</span><br><br>
                        <small>🟢 Real: ${(realScore * 100).toFixed(1)}% | 🔴 Fake: ${(fakeScore * 100).toFixed(1)}%</small>
                    </div>
                `;
            }

        } catch (err) {
            document.getElementById("test-results").innerHTML = `❌ Error: ${err.message}`;
            console.error("Full error:", err);
        }
    });

    document.getElementById("show-history").addEventListener("click", async () => {
        document.getElementById("main-view").style.display = "none";
        document.getElementById("history-view").style.display = "block";

        const res = await fetch(`${SERVER}/api/history`);
        const history = await res.json();
        renderHistory(history.map(entry => ({ ...entry, highlighted: false })));
    });

    document.getElementById("close-history").addEventListener("click", () => {
        document.getElementById("history-view").style.display = "none";
        document.getElementById("main-view").style.display = "block";
    });

}); // end DOMContentLoaded