
function normalize(lineEndings) {
  return lineEndings.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function createSSE(url, { token, onEvent, onOpen, onError } = {}) {
  let reader = null;
  let cancelled = false;
  let buffer = '';

  const dispatchFrame = (rawFrame) => {
    const frame = normalize(rawFrame);
    let eventType = 'message';
    const dataLines = [];
    frame.split('\n').forEach((line) => {
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    });
    if (dataLines.length === 0) return;
    try {
      const data = JSON.parse(dataLines.join('\n'));
      onEvent?.(eventType, data);
    } catch (e) {
    }
  };

  const connect = async () => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        cache: 'no-store',
      });

      if (!res.ok || !res.body) {
        onError?.(new Error(`SSE connect failed: ${res.status}`));
        return;
      }

      onOpen?.();
      reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawFrame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          dispatchFrame(rawFrame);
        }
      }
    } catch (err) {
      if (!cancelled) onError?.(err);
    }
  };

  connect();

  return {
    close() {
      cancelled = true;
      try {
        reader?.cancel();
      } catch (e) {
      }
    },
  };
}
