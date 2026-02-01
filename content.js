// X Video Downloader Content Script

const API_BASE = "http://localhost:3000/api";

// Create download button element
function createDownloadButton() {
  const button = document.createElement("button");
  button.className = "x-video-download-btn";

  // Create toad icon element
  const toadIcon = document.createElement("img");
  toadIcon.src = chrome.runtime.getURL("icon48.png");
  toadIcon.className = "toad-icon";
  toadIcon.style.width = "20px";
  toadIcon.style.height = "20px";

  const text = document.createElement("span");
  text.textContent = "Download";

  button.appendChild(toadIcon);
  button.appendChild(text);
  button.title = "Download this video with Twoad";
  return button;
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

// Handle download button click
async function handleDownload(tweetUrl, button) {
  button.disabled = true;
  const textSpan = button.querySelector("span");
  const originalText = textSpan.textContent;
  textSpan.textContent = "Loading...";

  try {
    // Call FixTweet API directly (public, no auth needed)
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

    // Get the highest quality variant
    const firstVideo = videos[0];
    const variants = firstVideo.variants || [];

    // Filter for MP4 and sort by bitrate
    const mp4Variants = variants
      .filter((v) => v.content_type === "video/mp4")
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    if (mp4Variants.length === 0) {
      throw new Error("No MP4 video found");
    }

    const bestVideo = mp4Variants[0];

    // Fetch the video as a blob to force download
    textSpan.textContent = "Downloading...";
    const videoResponse = await fetch(bestVideo.url);

    if (!videoResponse.ok) {
      throw new Error("Failed to download video");
    }

    const blob = await videoResponse.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Get filename settings from storage
    const settings = await chrome.storage.sync.get({ filenamePrefix: "twoad" });
    const prefix = settings.filenamePrefix || "twoad";
    const filename = `${prefix}_${Date.now()}.mp4`;

    // Use Chrome Downloads API to bypass browser download restrictions
    chrome.downloads.download(
      {
        url: blobUrl,
        filename: filename,
        saveAs: false,
      },
      (downloadId) => {
        // Clean up blob URL after download starts
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        if (chrome.runtime.lastError) {
          console.error("Download error:", chrome.runtime.lastError);
          throw new Error(chrome.runtime.lastError.message);
        }
      },
    );

    // Show success
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
  // Check if button already exists
  if (videoContainer.querySelector(".x-video-download-btn")) {
    return;
  }

  const video = videoContainer.querySelector("video");
  if (!video) return;

  const tweetUrl = getTweetUrl(videoContainer);
  if (!tweetUrl) return;

  const button = createDownloadButton();

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDownload(tweetUrl, button);
  });

  // Find the video controls area or create our own container
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
function observeVideos() {
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

  // Initial check for existing videos
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
  document.addEventListener("DOMContentLoaded", observeVideos);
} else {
  observeVideos();
}
