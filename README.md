# Twoad 🐸

A Chrome/Edge browser extension that lets you download Twitter/X videos with one click!

![Twoad Icon](icon128.png)

## Features

- 🐸 **One-Click Downloads** - Download button appears on every video
- ⚡ **Lightning Fast** - Uses FixTweet API for reliable downloads
- 🎨 **Clean Design** - Seamlessly integrated cyan-themed UI
- 🔒 **Privacy First** - No server needed, works standalone
- ⚙️ **Customizable Filenames** - Set your own filename prefix
- 🚫 **No Download Limits** - Bypasses browser restrictions

## Installation

### Install Extension in Chrome/Edge

1. Open Chrome/Edge and go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select this folder
5. You're ready to hop! 🐸

## Usage

1. Visit any tweet with a video on Twitter/X
2. Look for the cyan **Download** button with toad icon
3. Click it to download the video in highest quality
4. Videos save as `twoad_timestamp.mp4` (customizable)

## Customization

Click the extension icon to:
- Change the filename prefix (default: `twoad`)
- View extension status

## How It Works

1. Detects videos on Twitter/X pages using MutationObserver
2. Adds a styled download button overlay
3. Fetches video info from FixTweet API
4. Downloads highest quality MP4 variant
5. Saves with custom filename using Chrome Downloads API

## Tech Stack

- Vanilla JavaScript (no dependencies!)
- Chrome Extension Manifest V3
- FixTweet API for video extraction
- Chrome Downloads API for reliable downloads

## Troubleshooting

**Download button not appearing?**
- Refresh the Twitter/X page
- Check the browser console for errors
- Make sure you're on a tweet with a video

**Download not starting?**
- Ensure the extension has "downloads" permission
- Check if the video is available (some tweets may be restricted)

## Development

The extension consists of:
- `manifest.json` - Extension configuration
- `content.js` - Main logic (injected into Twitter/X pages)
- `styles.css` - Button styling
- `popup.html` / `popup.js` - Extension popup UI with settings

## License

Copyright (c) 2026 Twoad. All rights reserved.
