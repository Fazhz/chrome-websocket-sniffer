# WebSocket Sniffer Chrome Extension

This repository contains a Chrome extension that captures WebSocket activity from any tab and displays the events in an action popup.

## Features

- Hooks into page WebSocket objects to log lifecycle events and payloads.
- Shows incoming, outgoing, open, close, and error events with timestamps.
- Persists captured events via `chrome.storage` so the history is available while the extension is active.
- Provides a popup UI with a running counter and the ability to clear logs.

## Getting Started

1. Clone this repository or download the source code.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing this project.
5. Navigate to any website that uses WebSockets. The extension will automatically capture traffic for the active tab.
6. Click the extension icon to open the popup and inspect captured events.

## Development Notes

- The extension injects a small script at `document_start` to wrap the native `WebSocket` constructor. This wrapper forwards lifecycle events and message payloads to the extension via `window.postMessage`.
- The background service worker stores logs in `chrome.storage.local` and serves them to the popup on demand.
- You can clear the history at any time from the popup using the **Clear** button.

## Limitations

- Binary payloads are summarized with their type and size rather than full contents.
- Pages that redefine the global `WebSocket` constructor after our script runs might prevent logging.
- The extension only inspects WebSocket usage initiated after the content script loads; existing connections opened before installation are not tracked.
