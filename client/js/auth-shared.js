(function (global) {
  const MAX_LOG_LINES = 40;
  const FRONTEND_PORT_HINTS = new Set(['5173', '3000', '4173', '5500', '8080']);
  let cachedBaseUrl = null;

  const safeStringify = (value) => {
    if (value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  };

  const normaliseBaseUrl = (value) => {
    if (!value) {
      return 'http://127.0.0.1:8000';
    }

    const trimmed = String(value).trim();

    try {
      const url = new URL(trimmed);
      url.pathname = '';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (error) {
      try {
        const fallback = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`);
        fallback.pathname = '';
        fallback.search = '';
        fallback.hash = '';
        return fallback.toString().replace(/\/$/, '');
      } catch (innerError) {
        return 'http://127.0.0.1:8000';
      }
    }
  };

  const detectApiBaseUrl = () => {
    if (cachedBaseUrl) {
      return cachedBaseUrl;
    }

    const candidateFromQuery = (() => {
      try {
        const params = new URLSearchParams(global.location.search);
        return params.get('apiBase');
      } catch (error) {
        return null;
      }
    })();

    const candidates = [
      global.__DSBP_API_BASE__,
      candidateFromQuery,
      global.localStorage ? global.localStorage.getItem('dsbp_api_base_url') : null,
      (() => {
        const meta = global.document && global.document.querySelector('meta[name="dsbp-api-base"]');
        return meta ? meta.getAttribute('content') : null;
      })(),
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        cachedBaseUrl = normaliseBaseUrl(candidate);
        return cachedBaseUrl;
      }
    }

    try {
      const { protocol, host, hostname, port } = global.location;

      if (host) {
        const normalisedHost = protocol ? `${protocol}//${host}` : `http://${host}`;
        const normalised = normaliseBaseUrl(normalisedHost);

        if (port && FRONTEND_PORT_HINTS.has(port)) {
          cachedBaseUrl = normaliseBaseUrl(`${protocol || 'http:'}//${hostname}:8000`);
          return cachedBaseUrl;
        }

        cachedBaseUrl = normalised;
        return cachedBaseUrl;
      }

      if (hostname) {
        cachedBaseUrl = normaliseBaseUrl(`${protocol || 'http:'}//${hostname}:8000`);
        return cachedBaseUrl;
      }
    } catch (error) {
      // Ignore detection errors and fall back to default
    }

    cachedBaseUrl = 'http://127.0.0.1:8000';
    return cachedBaseUrl;
  };

  const createDebugLogger = (container) => {
    const entries = [];

    const refresh = () => {
      if (!container) {
        return;
      }

      if (entries.length === 0) {
        container.textContent = '';
        container.setAttribute('hidden', '');
      } else {
        container.textContent = entries.join('\n');
        container.removeAttribute('hidden');
      }
    };

    return {
      log(event, detail) {
        const timestamp = new Date().toISOString();
        const message = detail !== undefined ? `${event}: ${safeStringify(detail)}` : event;
        const line = `[${timestamp}] ${message}`;
        entries.push(line);

        if (entries.length > MAX_LOG_LINES) {
          entries.splice(0, entries.length - MAX_LOG_LINES);
        }

        refresh();
        try {
          global.console.debug(`[DSBP][Auth] ${event}`, detail);
        } catch (error) {
          // Swallow console errors silently
        }
      },
      clear() {
        entries.splice(0, entries.length);
        refresh();
      },
      entries,
    };
  };

  const parseErrorMessage = (result, fallbackMessage) => {
    if (!result) {
      return fallbackMessage;
    }

    const { data, error } = result;

    if (data) {
      if (typeof data === 'string') {
        return data;
      }

      if (data.detail) {
        if (typeof data.detail === 'string') {
          return data.detail;
        }

        try {
          return JSON.stringify(data.detail);
        } catch (jsonError) {
          return fallbackMessage;
        }
      }

      if (data.message) {
        return data.message;
      }
    }

    if (error && error.message) {
      return error.message;
    }

    return fallbackMessage;
  };

  const requestAuth = async (endpoint, payload, options = {}) => {
    const {
      baseUrl = detectApiBaseUrl(),
      timeoutMs = 15000,
      headers: customHeaders = {},
      onDebug,
    } = options;

    const normalisedBase = normaliseBaseUrl(baseUrl);
    const target = `${normalisedBase}/api/auth/${String(endpoint).replace(/^\/+/, '')}`;
    const controller = new AbortController();
    const timer = global.setTimeout(() => controller.abort(), timeoutMs);

    onDebug?.('request:start', { url: target, payload });

    try {
      const response = await global.fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...customHeaders,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      onDebug?.('response:status', { status: response.status, statusText: response.statusText });

      const rawBody = await response.text();
      onDebug?.('response:raw', rawBody || '(empty body)');

      let data = null;
      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch (error) {
          onDebug?.('response:parse-error', error.message);
          data = rawBody;
        }
      }

      const result = { ok: response.ok, status: response.status, data };

      if (!response.ok) {
        result.error = new Error(parseErrorMessage(result, `Request failed with status ${response.status}`));
      }

      onDebug?.('response:complete', { ok: result.ok, status: result.status });

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutResult = {
          ok: false,
          status: 0,
          data: null,
          error: new Error('Request timed out before the server responded. Ensure the backend is running.'),
        };
        onDebug?.('response:timeout', timeoutResult.error.message);
        return timeoutResult;
      }

      const failure = { ok: false, status: 0, data: null, error };
      onDebug?.('response:error', { message: error.message, name: error.name });
      return failure;
    } finally {
      global.clearTimeout(timer);
    }
  };

  const persistSession = (token, user) => {
    try {
      if (token) {
        global.localStorage?.setItem('dsbp_access_token', token);
      }

      if (user) {
        const serialised = JSON.stringify(user);
        global.localStorage?.setItem('dsbp_user', serialised);
      }
    } catch (error) {
      // Ignore storage errors (e.g. private mode restrictions)
    }
  };

  const clearSession = () => {
    try {
      global.localStorage?.removeItem('dsbp_access_token');
      global.localStorage?.removeItem('dsbp_user');
    } catch (error) {
      // ignore
    }
  };

  global.DSBPAuth = {
    detectApiBaseUrl,
    normaliseBaseUrl,
    requestAuth,
    createDebugLogger,
    persistSession,
    clearSession,
    parseErrorMessage,
  };
})(window);
