//secret key stuff 
var myKey = config.hugging_key;

// function
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("test-dataset").addEventListener("click", async () => {
        document.getElementById("test-results").innerHTML = "Analyzing...";

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tab.url;

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
            // function
            if (!title) {
                document.getElementById("test-results").innerHTML = "❌ Could not find an article title on this page.";
                return;
            }

            const response = await fetch(
                "https://router.huggingface.co/hf-inference/models/XSY/albert-base-v2-fakenews-discriminator",
                {
                    headers: {
                        "Content-Type": "application/json",
                        // "key" is a secret token 
                        "Authorization": "Bearer"+ myKey
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: title })
                }
            );

            const data = await response.json();
            console.log("Raw API response:", JSON.stringify(data, null, 2));

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

            // --- Save to chrome.storage.local --- (will change becasue want to save to database)
            chrome.storage.local.get("history", (result) => {
                const history = result.history || [];
                history.unshift({
                    url: currentUrl,
                    title: title,
                    verdict: isReal ? "real" : "fake",
                    realScore: (realScore * 100).toFixed(1),
                    fakeScore: (fakeScore * 100).toFixed(1),
                    date: new Date().toLocaleString()
                });
                chrome.storage.local.set({ history });
            });
            //real or fake (change name to trusgtworthy/ not trust worthy)
            document.getElementById("test-results").innerHTML = `
                <div style="padding: 10px; border: 2px solid ${color}; border-radius: 6px; margin-top: 10px;">
                    <small><strong>Title:</strong> ${title}</small><br><br>
                    <strong style="color: ${color}; font-size: 18px;">${verdict}</strong><br>
                    <span>Confidence: ${confidence}%</span><br><br>
                    <small>🟢 Real: ${(realScore * 100).toFixed(1)}% | 🔴 Fake: ${(fakeScore * 100).toFixed(1)}%</small>
                </div>
            `;

        } catch (err) {
            document.getElementById("test-results").innerHTML = `❌ Error: ${err.message}`;
            console.error("Full error:", err);
        }
    });
});
// show history button
document.getElementById("show-history").addEventListener("click", () => {
    chrome.storage.local.get("history", (result) => {
        const history = result.history || [];

        if (history.length === 0) {
            document.getElementById("history-results").innerHTML = "<p>No history yet.</p>";
            return;
        }
        //
        document.getElementById("history-results").innerHTML = `
            <div style="margin-top: 10px;">
                <strong>History (${history.length} articles)</strong>
                <button id="clear-history" style="float:right; background:none; border:none; color:red; cursor:pointer;">Clear</button>
            </div>
            ${history.map(entry => `
                <div style="padding: 8px; border: 1px solid ${entry.verdict === 'real' ? '#2eccb6' : '#e74c3c'}; border-radius: 6px; margin-top: 6px; font-size: 12px;">
                    <strong>${entry.verdict === 'real' ? '🟢 Real' : '🔴 Fake'}</strong> — ${entry.date}<br>
                    <a href="${entry.url}" target="_blank" style="color: #555; word-break: break-all;">${entry.title}</a><br>
                    <small>🟢 ${entry.realScore}% | 🔴 ${entry.fakeScore}%</small>
                </div>
            `).join("")}
        `;
        // change or even remove this becasue data will be stored somewhere else.
        document.getElementById("clear-history").addEventListener("click", () => {
            chrome.storage.local.remove("history", () => {
                document.getElementById("history-results").innerHTML = "<p>History cleared.</p>";
            });
        });
    });

});
