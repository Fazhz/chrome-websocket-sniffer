document.addEventListener('DOMContentLoaded', () => {
  const logList = document.getElementById('log-list');
  const count = document.getElementById('count');
  const clearButton = document.getElementById('clear');
  const template = document.getElementById('log-entry');

  const render = (logs) => {
    logList.innerHTML = '';
    count.textContent = logs.length.toString();

    logs
      .slice()
      .reverse()
      .forEach((entry) => {
        const clone = template.content.firstElementChild.cloneNode(true);
        clone.dataset.event = entry.event;

        clone.querySelector('.event').textContent = entry.event;
        clone.querySelector('.timestamp').textContent = formatTime(entry.time);
        clone.querySelector('.url').textContent = entry.url || 'unknown url';
        clone.querySelector('.socket').textContent = `Socket: ${entry.socketId}`;
        clone.querySelector('.payload').textContent = describePayload(entry);

        logList.appendChild(clone);
      });
  };

  const describePayload = (entry) => {
    if (!entry.data) {
      return '';
    }

    const { kind, preview, size, mimeType } = entry.data;
    const sizeLabel = typeof size === 'number' ? ` (${size} bytes)` : '';

    if (kind === 'text') {
      return preview || '';
    }

    if (preview) {
      return `${kind}${sizeLabel}: ${preview}`;
    }

    if (mimeType) {
      return `${kind}${sizeLabel} - ${mimeType}`;
    }

    return `${kind || 'unknown'}${sizeLabel}`;
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (error) {
      return '';
    }
  };

  const fetchLogs = () => {
    chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to retrieve logs', chrome.runtime.lastError);
        return;
      }
      render(response?.logs ?? []);
    });
  };

  clearButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to clear logs', chrome.runtime.lastError);
        return;
      }
      fetchLogs();
    });
  });

  fetchLogs();
});
