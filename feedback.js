const SERVER = "http://127.0.0.1:3000";

const params = new URLSearchParams(window.location.search);
const url = decodeURIComponent(params.get("url") || "");
const title = decodeURIComponent(params.get("title") || "");
const verdict = decodeURIComponent(params.get("verdict") || "");

document.getElementById("article-title").textContent = title || "Unknown article";

const badge = document.getElementById("verdict-badge");
badge.textContent = verdict === "real" ? "🟢 Verified" : "🔴 Unverified";
badge.className = `verdict-badge ${verdict === "real" ? "real" : "unverified"}`;

let selectedOpinion = "";

document.getElementById("agree-btn").addEventListener("click", () => {
    selectedOpinion = "Agree";
    document.getElementById("agree-btn").classList.add("selected");
    document.getElementById("disagree-btn").classList.remove("selected");
    document.getElementById("unsure-btn").classList.remove("selected");
});

document.getElementById("disagree-btn").addEventListener("click", () => {
    selectedOpinion = "Disagree";
    document.getElementById("disagree-btn").classList.add("selected");
    document.getElementById("agree-btn").classList.remove("selected");
    document.getElementById("unsure-btn").classList.remove("selected");
});

document.getElementById("unsure-btn").addEventListener("click", () => {
    selectedOpinion = "Unsure";
    document.getElementById("unsure-btn").classList.add("selected");
    document.getElementById("agree-btn").classList.remove("selected");
    document.getElementById("disagree-btn").classList.remove("selected");
});

document.getElementById("submit-btn").addEventListener("click", async () => {
    const comments = document.getElementById("comments").value.trim();
    const feedback = selectedOpinion
        ? `${selectedOpinion}${comments ? ": " + comments : ""}`
        : comments;

    if (!feedback) {
        alert("Please select an option or leave a comment before submitting.");
        return;
    }

    await fetch(`${SERVER}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, feedback })
    });

    document.getElementById("success-msg").style.display = "block";
    document.getElementById("submit-btn").disabled = true;

    setTimeout(() => {
        window.location.href = chrome.runtime.getURL("dashboard.html");
    }, 2000);
});