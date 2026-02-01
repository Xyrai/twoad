// Load saved settings and history on popup open
document.addEventListener("DOMContentLoaded", async () => {
  // Tab switching
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((tc) => tc.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(targetTab).classList.add("active");

      if (targetTab === "history") {
        loadHistory();
      }
    });
  });

  // Load settings
  const settings = await chrome.storage.sync.get({
    filenamePrefix: "twoad",
    videoQuality: "highest",
  });

  document.getElementById("filenamePrefix").value = settings.filenamePrefix;
  document.getElementById("videoQuality").value = settings.videoQuality;

  // Save button handler
  const saveButton = document.getElementById("saveSettings");
  const status = document.getElementById("saveStatus");

  saveButton.addEventListener("click", async () => {
    const prefix =
      document.getElementById("filenamePrefix").value.trim() || "twoad";
    const quality = document.getElementById("videoQuality").value;

    // Sanitize filename - remove invalid characters
    const sanitized = prefix.replace(/[<>:"/\\|?*]/g, "");
    document.getElementById("filenamePrefix").value = sanitized;

    await chrome.storage.sync.set({
      filenamePrefix: sanitized,
      videoQuality: quality,
    });

    status.textContent = "✓ Saved!";
    status.className = "save-status success";

    setTimeout(() => {
      status.textContent = "";
      status.className = "save-status";
    }, 2000);
  });

  // Save on Enter key in filename input
  document
    .getElementById("filenamePrefix")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveButton.click();
      }
    });

  // Clear history button
  document
    .getElementById("clearHistory")
    .addEventListener("click", async () => {
      if (confirm("Clear all download history?")) {
        await chrome.storage.local.set({ downloadHistory: [] });
        loadHistory();
      }
    });
});

// Load and display history
async function loadHistory() {
  const historyList = document.getElementById("historyList");
  const emptyHistory = document.getElementById("emptyHistory");
  const clearButton = document.getElementById("clearHistory");

  const data = await chrome.storage.local.get({ downloadHistory: [] });
  const history = data.downloadHistory || [];

  historyList.innerHTML = "";

  if (history.length === 0) {
    emptyHistory.style.display = "block";
    clearButton.style.display = "none";
  } else {
    emptyHistory.style.display = "none";
    clearButton.style.display = "block";

    history.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleString();

      li.innerHTML = `
        <div class="history-filename">${item.filename}</div>
        <div class="history-meta">
          <span class="history-type">${item.type}</span>
          ${timeStr}
        </div>
      `;

      historyList.appendChild(li);
    });
  }
}
