import type { StreamingTransport, StreamingTransportResult } from "./toolLoop";

/**
 * Parses raw SSE text into individual JSON-parsed data payloads.
 * Handles buffering of incomplete lines across XHR progress events.
 */
function parseSseChunks(
  raw: string,
  incompleteBuffer: string
): { chunks: unknown[]; remaining: string } {
  const chunks: unknown[] = [];
  const text = incompleteBuffer + raw;
  const lines = text.split("\n");

  // Last element may be incomplete if input doesn't end with newline
  const remaining = raw.endsWith("\n") ? "" : (lines.pop() ?? "");

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const data = line.substring(6).trim();
    if (data === "[DONE]") continue;
    try {
      chunks.push(JSON.parse(data));
    } catch {
      // skip unparseable lines
    }
  }

  return { chunks, remaining };
}

/**
 * XHR-based streaming transport for React Native environments.
 *
 * React Native's `fetch` doesn't support `response.body` streaming,
 * so this transport uses `XMLHttpRequest` with `onprogress` to stream
 * SSE events. It exposes the same `{ stream: AsyncIterable }` interface
 * as the default fetch-based transport.
 */
export const xhrTransport: StreamingTransport = (options): StreamingTransportResult => {
  // We use a simple push-queue that the async generator pulls from.
  type QueueItem =
    | { type: "data"; value: unknown }
    | { type: "error"; error: Error }
    | { type: "done" };

  const queue: QueueItem[] = [];
  let resolve: (() => void) | null = null;
  let finished = false;

  function push(item: QueueItem) {
    queue.push(item);
    if (resolve) {
      resolve();
      resolve = null;
    }
  }

  function waitForItem(): Promise<void> {
    if (queue.length > 0) return Promise.resolve();
    return new Promise<void>((r) => {
      resolve = r;
    });
  }

  // Start XHR
  const xhr = new XMLHttpRequest();
  const url = `${options.baseUrl}${options.endpoint}`;
  let lastProcessedIndex = 0;
  let incompleteBuffer = "";

  const abortHandler = () => {
    xhr.abort();
  };
  if (options.signal) {
    if (options.signal.aborted) {
      // Already aborted
      push({ type: "done" });
      finished = true;
    } else {
      options.signal.addEventListener("abort", abortHandler);
    }
  }

  if (!finished) {
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (options.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
    }
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        xhr.setRequestHeader(key, value);
      }
    }
    xhr.setRequestHeader("Accept", "text/event-stream");

    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastProcessedIndex);
      lastProcessedIndex = xhr.responseText.length;

      const { chunks, remaining } = parseSseChunks(newData, incompleteBuffer);
      incompleteBuffer = remaining;

      for (const chunk of chunks) {
        push({ type: "data", value: chunk });
      }
    };

    xhr.onload = () => {
      options.signal?.removeEventListener("abort", abortHandler);

      // Process remaining buffer
      if (incompleteBuffer) {
        const { chunks } = parseSseChunks(incompleteBuffer + "\n", "");
        incompleteBuffer = "";
        for (const chunk of chunks) {
          push({ type: "data", value: chunk });
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        push({ type: "done" });
      } else {
        const error = new Error(`SSE failed: ${xhr.status} ${xhr.statusText}`);
        if (options.onSseError) options.onSseError(error);
        push({ type: "done" });
      }
      finished = true;
    };

    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", abortHandler);
      const error = new Error("Network error");
      if (options.onSseError) options.onSseError(error);
      push({ type: "done" });
      finished = true;
    };

    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", abortHandler);
      push({ type: "done" });
      finished = true;
    };

    xhr.send(JSON.stringify(options.body));
  }

  async function* createStream() {
    while (true) {
      await waitForItem();
      while (queue.length > 0) {
        const item = queue.shift()!;
        if (item.type === "done") return;
        if (item.type === "error") throw item.error;
        yield item.value;
      }
    }
  }

  return { stream: createStream() };
};
