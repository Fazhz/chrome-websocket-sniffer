const STORAGE_KEY = 'wsLogs';
let cache = [];

async function loadCache() {
  try {
    const result = await chrome.storage.local.get({ [STORAGE_KEY]: [] });
    cache = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  } catch (error) {
    console.error('Failed to load WebSocket logs from storage', error);
    cache = [];
  }
}

async function persistCache() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: cache });
  } catch (error) {
    console.error('Failed to persist WebSocket logs', error);
  }
}

loadCache();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === 'WS_LOG') {
    const entry = {
      ...message.payload,
      tabId: sender.tab ? sender.tab.id : null
    };
    cache.push(entry);
    persistCache();
    return false;
  }

  if (message.type === 'GET_LOGS') {
    (async () => {
      if (!cache.length) {
        await loadCache();
      }
      sendResponse({ logs: cache });
    })();
    return true;
  }

  if (message.type === 'CLEAR_LOGS') {
    (async () => {
      cache = [];
      await persistCache();
      sendResponse({ success: true });
    })();
    return true;
  }

  return false;
});
