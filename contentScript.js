(function init() {
  injectHook();
  setupBridge();

  function injectHook() {
    const scriptContent = `(${hookWebSocket.toString()})();`;
    const script = document.createElement('script');
    script.textContent = scriptContent;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  function setupBridge() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return;
      }

      const data = event.data;
      if (!data || data.source !== 'ws-sniffer') {
        return;
      }

      chrome.runtime.sendMessage({
        type: 'WS_LOG',
        payload: data.payload
      }).catch((error) => {
        console.warn('Failed to forward WebSocket log', error);
      });
    });
  }

  function hookWebSocket() {
    const serializeData = (input) => {
      if (typeof input === 'string') {
        return { kind: 'text', preview: input, size: input.length };
      }

      if (input instanceof ArrayBuffer) {
        return { kind: 'arraybuffer', size: input.byteLength };
      }

      if (ArrayBuffer.isView(input)) {
        return { kind: input.constructor.name, size: input.byteLength };
      }

      if (typeof Blob !== 'undefined' && input instanceof Blob) {
        return { kind: 'blob', size: input.size, mimeType: input.type };
      }

      try {
        const json = JSON.stringify(input);
        return { kind: typeof input, preview: json, size: json.length };
      } catch (error) {
        return { kind: typeof input, preview: String(input) };
      }
    };

    const post = (payload) => {
      window.postMessage({ source: 'ws-sniffer', payload }, '*');
    };

    if (window.__WS_SNIFFER_INSTALLED__) {
      return;
    }
    window.__WS_SNIFFER_INSTALLED__ = true;

    const OriginalWebSocket = window.WebSocket;
    if (!OriginalWebSocket) {
      return;
    }

    const decorateSocket = (socket, args) => {
      if (!socket || socket.__WS_SNIFFER_DECORATED__) {
        return socket;
      }

      try {
        const socketId = `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const url = socket.url || (args && args[0]) || 'unknown';

        Object.defineProperty(socket, '__WS_SNIFFER_DECORATED__', {
          value: true,
          enumerable: false,
          configurable: false
        });

        post({
          event: 'created',
          socketId,
          url,
          time: Date.now()
        });

        socket.addEventListener('open', () => {
          post({ event: 'open', socketId, url, time: Date.now() });
        });

        socket.addEventListener('close', (event) => {
          post({
            event: 'close',
            socketId,
            url,
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            time: Date.now()
          });
        });

        socket.addEventListener('error', () => {
          post({ event: 'error', socketId, url, time: Date.now() });
        });

        socket.addEventListener('message', (event) => {
          post({
            event: 'incoming',
            socketId,
            url,
            data: serializeData(event.data),
            time: Date.now()
          });
        });

        const originalSend = socket.send;
        socket.send = function (...sendArgs) {
          try {
            post({
              event: 'outgoing',
              socketId,
              url,
              data: serializeData(sendArgs[0]),
              time: Date.now()
            });
          } catch (error) {
            console.warn('Failed to log outgoing WebSocket message', error);
          }
          return originalSend.apply(this, sendArgs);
        };
      } catch (error) {
        console.warn('WebSocket sniffer failed to decorate socket', error);
      }
      return socket;
    };

    const WebSocketProxy = new Proxy(OriginalWebSocket, {
      construct(target, args) {
        const socket = new target(...args);
        return decorateSocket(socket, args);
      },
      apply(target, thisArg, args) {
        const socket = new target(...args);
        return decorateSocket(socket, args);
      }
    });

    WebSocketProxy.prototype = OriginalWebSocket.prototype;
    try {
      Object.setPrototypeOf(WebSocketProxy, OriginalWebSocket);
    } catch (error) {
      // Ignore if prototype cannot be set (older browsers).
    }

    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach((prop) => {
      Object.defineProperty(WebSocketProxy, prop, {
        value: OriginalWebSocket[prop],
        writable: false,
        configurable: true,
        enumerable: true
      });
    });

    window.WebSocket = WebSocketProxy;
  }
})();
