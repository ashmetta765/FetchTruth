async function testAgainstDataset() {
  const results = [];
//this is ai api call
  for (const [trueLabel, samples] of Object.entries(DATASET_SAMPLES)) {
    for (const sample of samples) {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/XSY/albert-base-v2-fakenews-discriminator",
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": 'key'
          },
          method: "POST",
          body: JSON.stringify({ inputs: sample.title})
        }
      );
      //this is the score creator
      const data = await response.json();
      const top = data[0].reduce((a, b) => a.score > b.score ? a : b);
      const predictedLabel = top.label === "LABEL_1" ? "real" : "fake";

      results.push({
        title: sample.title,
        trueLabel,
        predictedLabel,
        score: (top.score * 100).toFixed(1),
        correct: trueLabel === predictedLabel
      });
    }
  }

  return results;
}
// send info from test dataset to llm

async function testAgainstDataset() {
  const results = [];

  for (const [trueLabel, samples] of Object.entries(DATASET_SAMPLES)) {
    for (const sample of samples) {
      const response = await fetch(
        "https://router.huggingface.co/hf-inference/models/XSY/albert-base-v2-fakenews-discriminator",
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": "key"
          },
          method: "POST",
          body: JSON.stringify({ inputs: sample.title })
        }
      );

      const data = await response.json();

      // ✅ Check what API is actually returning before reading data[0]
      console.log("API response for:", sample.title, data);

      // ✅ Handle error responses from HF API
      if (data.error) {
        console.error("HF API error:", data.error);
        results.push({
          title: sample.title,
          trueLabel,
          predictedLabel: "unknown",
          score: "0",
          correct: false,
          error: data.error
        });
        continue; // skip to next sample
      }

      // ✅ Handle model still loading
      if (!Array.isArray(data) || !data[0]) {
        console.error("Unexpected response format:", data);
        results.push({
          title: sample.title,
          trueLabel,
          predictedLabel: "unknown",
          score: "0",
          correct: false,
          error: "Unexpected response"
        });
        continue;
      }

      const top = data[0].reduce((a, b) => a.score > b.score ? a : b);
      const predictedLabel = top.label === "LABEL_1" ? "real" : "fake";

      results.push({
        title: sample.title,
        trueLabel,
        predictedLabel,
        score: (top.score * 100).toFixed(1),
        correct: trueLabel === predictedLabel
      });
    }
  }

  return results;
}

document.getElementById("test-dataset").addEventListener("click", async () => {
  document.getElementById("test-results").innerHTML = "Analyzing...";

  try {
    const results = await testAgainstDataset();
    const correct = results.filter(r => r.correct).length;

    document.getElementById("test-results").innerHTML = `
      <strong>Accuracy: ${correct}/${results.length}</strong><br>
      ${results.map(r => `
        <div style="margin-top:8px; padding:6px; border:1px solid #ddd; border-radius:4px">
          <small>${r.title}</small><br>
          ${r.error 
            ? `⚠️ Error: ${r.error}` 
            : `${r.correct ? "✅" : "❌"} Predicted: ${r.predictedLabel} (${r.score}%)`
          }
        </div>
      `).join("")}
    `;
  } catch (err) {
    document.getElementById("test-results").innerHTML = `❌ Error: ${err.message}`;
    console.error("Full error:", err);
  }
});