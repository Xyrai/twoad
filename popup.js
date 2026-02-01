// Load saved settings on popup open
document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("filenamePrefix");
  const saveButton = document.getElementById("saveSettings");
  const status = document.getElementById("saveStatus");

  // Load current settings
  const settings = await chrome.storage.sync.get({ filenamePrefix: "twoad" });
  input.value = settings.filenamePrefix;

  // Save button handler
  saveButton.addEventListener("click", async () => {
    const prefix = input.value.trim() || "twoad";

    // Sanitize filename - remove invalid characters
    const sanitized = prefix.replace(/[<>:"/\\|?*]/g, "");
    input.value = sanitized;

    await chrome.storage.sync.set({ filenamePrefix: sanitized });

    status.textContent = "✓ Saved!";
    status.className = "save-status success";

    setTimeout(() => {
      status.textContent = "";
      status.className = "save-status";
    }, 2000);
  });

  // Save on Enter key
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveButton.click();
    }
  });
});
