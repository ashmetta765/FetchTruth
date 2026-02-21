document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("test-dataset").addEventListener("click", async () => {
        document.getElementById("test-results").innerHTML = "Analyzing...";

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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
            console.log("Raw API response:", JSON.stringify(data, null, 2));

            if (data.error) {
                document.getElementById("test-results").innerHTML = `⚠️ Model error: ${data.error}`;
                return;
            }

            if (!Array.isArray(data) || !data[0]) {
                document.getElementById("test-results").innerHTML = `⚠️ Unexpected response format.`;
                return;
            }

            // Explicitly find LABEL_0 (fake) and LABEL_1 (real) scores
            const labels = data[0];
            const fakeScore = labels.find(l => l.label === "LABEL_0")?.score ?? 0;
            const realScore = labels.find(l => l.label === "LABEL_1")?.score ?? 0;

            const isReal = realScore > fakeScore;
            const confidence = (Math.max(realScore, fakeScore) * 100).toFixed(1);
            const verdict = isReal ? "🟢 Real" : "🔴 Fake";
            const color = isReal ? "#2eccb6" : "#e74c3c";

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