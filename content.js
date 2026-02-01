// Twoad Content Script

// Create download button element
function createDownloadButton(mediaType = "video") {
  const button = document.createElement("button");
  button.className = "x-video-download-btn";

  // Create toad icon element (use text emoji as fallback if chrome API unavailable)
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.getURL
  ) {
    try {
      const toadIcon = document.createElement("img");
      toadIcon.src = chrome.runtime.getURL("icon48.png");
      toadIcon.className = "toad-icon";
      toadIcon.style.width = "20px";
      toadIcon.style.height = "20px";
      toadIcon.onerror = function () {
        // If image fails to load, replace with emoji
        this.style.display = "none";
        const emoji = document.createElement("span");
        emoji.textContent = "🐸";
        emoji.style.fontSize = "16px";
        button.insertBefore(emoji, button.firstChild);
      };
      button.appendChild(toadIcon);
    } catch (e) {
      // Fallback to emoji
      const emoji = document.createElement("span");
      emoji.textContent = "🐸";
      emoji.style.fontSize = "16px";
      button.appendChild(emoji);
    }
  } else {
    // Fallback to emoji if chrome API not available
    const emoji = document.createElement("span");
    emoji.textContent = "🐸";
    emoji.style.fontSize = "16px";
    button.appendChild(emoji);
  }

  const text = document.createElement("span");
  text.textContent = "Download";

  button.appendChild(text);
  button.title = `Download this ${mediaType} with Twoad`;
  button.dataset.mediaType = mediaType;
  return button;
}

// Add to history
async function addToHistory(filename, type, url) {
  const history = await chrome.storage.local.get({ downloadHistory: [] });
  const newEntry = {
    filename,
    type,
    url,
    timestamp: Date.now(),
  };

  history.downloadHistory.unshift(newEntry);
  // Keep only last 50 downloads
  if (history.downloadHistory.length > 50) {
    history.downloadHistory = history.downloadHistory.slice(0, 50);
  }

  await chrome.storage.local.set({ downloadHistory: history.downloadHistory });
}

// Extract tweet URL from the current context
function getTweetUrl(videoElement) {
  // Find the closest article element (tweet container)
  const article = videoElement.closest('article[data-testid="tweet"]');
  if (!article) return null;

  // Try to find the tweet link
  const timeLink = article.querySelector('a[href*="/status/"]');
  if (timeLink) {
    const href = timeLink.getAttribute("href");
    return `https://x.com${href}`;
  }

  // Fallback: get from current URL if we're on a tweet page
  const currentUrl = window.location.href;
  if (currentUrl.includes("/status/")) {
    return currentUrl.split("?")[0];
  }

  return null;
}

// Handle video download
async function handleVideoDownload(tweetUrl, button) {
  button.disabled = true;
  const textSpan = button.querySelector("span");
  const originalText = textSpan.textContent;
  textSpan.textContent = "Loading...";

  try {
    // Get user settings
    const settings = await chrome.storage.sync.get({
      filenamePrefix: "twoad",
      videoQuality: "highest",
    });

    // Call FixTweet API directly
    const fixTweetUrl = tweetUrl
      .replace("twitter.com", "api.fxtwitter.com")
      .replace("x.com", "api.fxtwitter.com");

    const response = await fetch(fixTweetUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch video info");
    }

    const data = await response.json();

    if (!data.tweet || !data.tweet.media || !data.tweet.media.videos) {
      throw new Error("No video found in this tweet");
    }

    const videos = data.tweet.media.videos;
    if (videos.length === 0) {
      throw new Error("No video URLs found");
    }

    const firstVideo = videos[0];
    const variants = firstVideo.variants || [];

    // Filter for MP4 and sort by bitrate
    let mp4Variants = variants
      .filter((v) => v.content_type === "video/mp4")
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    if (mp4Variants.length === 0) {
      throw new Error("No MP4 video found");
    }

    // Select quality based on user preference
    let selectedVideo;
    if (settings.videoQuality === "lowest") {
      selectedVideo = mp4Variants[mp4Variants.length - 1];
    } else if (settings.videoQuality === "medium") {
      selectedVideo = mp4Variants[Math.floor(mp4Variants.length / 2)];
    } else {
      selectedVideo = mp4Variants[0]; // highest
    }

    // Fetch the video as a blob
    textSpan.textContent = "Downloading...";
    const videoResponse = await fetch(selectedVideo.url);

    if (!videoResponse.ok) {
      throw new Error("Failed to download video");
    }

    const blob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(blob);

    const prefix = settings.filenamePrefix || "twoad";
    const filename = `${prefix}_video_${Date.now()}.mp4`;

    // Use anchor tag for download (works in content scripts)
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up blob URL after download
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    // Add to history
    addToHistory(filename, "video", tweetUrl);

    textSpan.textContent = "✓ Downloaded";
    setTimeout(() => {
      textSpan.textContent = originalText;
      button.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Download error:", error);
    textSpan.textContent = "✗ Error";
    setTimeout(() => {
      textSpan.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }
}

// Add download button to video player
function addDownloadButton(videoContainer) {
  if (videoContainer.querySelector(".x-video-download-btn")) {
    return;
  }

  const video = videoContainer.querySelector("video");
  if (!video) return;

  const tweetUrl = getTweetUrl(videoContainer);
  if (!tweetUrl) return;

  const button = createDownloadButton("video");

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleVideoDownload(tweetUrl, button);
  });

  const playerContainer = videoContainer.querySelector(
    '[data-testid="videoPlayer"]',
  );
  if (playerContainer) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "x-video-download-container";
    buttonContainer.appendChild(button);
    playerContainer.appendChild(buttonContainer);
  }
}

// Observer to watch for new videos
function observeMedia() {
  const observer = new MutationObserver((mutations) => {
    // Look for video players
    const videoContainers = document.querySelectorAll(
      '[data-testid="videoPlayer"]',
    );
    videoContainers.forEach((container) => {
      addDownloadButton(container.parentElement);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial check
  setTimeout(() => {
    const videoContainers = document.querySelectorAll(
      '[data-testid="videoPlayer"]',
    );
    videoContainers.forEach((container) => {
      addDownloadButton(container.parentElement);
    });
  }, 1000);
}

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeMedia);
} else {
  observeMedia();
}
