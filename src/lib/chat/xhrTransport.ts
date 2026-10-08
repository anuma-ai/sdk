import type { StreamingTransport, StreamingTransportResult } from "./toolLoop";
import { INFERENCE_ID_HEADER } from "./toolLoop";

/**
 * Canonical message for a non-OK SSE response. This exact `SSE failed: {status}`
 * prefix is a CONTRACT: `resumeStream`'s status classifier (parseSseStatusCode)
 * and toolLoop's retry parser both extract the HTTP status from it to route 410
 * → expired vs 401/5xx → transient. Build the message through here so the
 * producer and those parsers can never drift apart (a contract test pins it).
 */
export function sseFailureMessage(status: number, statusText: string, detail = ""): string {
  return `SSE failed: ${status} ${statusText}${detail}`;
}

function parseSseChunks(
  raw: string,
  incompleteBuffer: string
): { chunks: unknown[]; remaining: string } {
  const chunks: unknown[] = [];
  const text = incompleteBuffer + raw;
  const lines = text.split("\n");

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

  const xhr = new XMLHttpRequest();
  const url = `${options.baseUrl}${options.endpoint}`;
  let lastProcessedIndex = 0;
  let incompleteBuffer = "";

  const makeAbortError = () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    return err;
  };

  const abortHandler = () => {
    xhr.abort();
  };
  if (options.signal) {
    if (options.signal.aborted) {
      finished = true;
    } else {
      options.signal.addEventListener("abort", abortHandler);
    }
  }

  if (!finished) {
    xhr.open(options.method ?? "POST", url, true);
    if (options.body !== undefined) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }
    if (options.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
    }
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        xhr.setRequestHeader(key, value);
      }
    }
    xhr.setRequestHeader("Accept", "text/event-stream");

    let metaFired = false;
    xhr.onreadystatechange = () => {
      if (metaFired || xhr.readyState < 2) return;
      metaFired = true;
      if (xhr.status < 200 || xhr.status >= 300) return;
      const id = xhr.getResponseHeader(INFERENCE_ID_HEADER);
      if (id && options.onStreamMeta) {
        try {
          options.onStreamMeta({ inferenceId: id });
        } catch {
          /* observer error, swallow */
        }
      }
    };

    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(lastProcessedIndex);
      lastProcessedIndex = xhr.responseText.length;

      if (newData.length > 0) options.onActivity?.();

      const { chunks, remaining } = parseSseChunks(newData, incompleteBuffer);
      incompleteBuffer = remaining;

      for (const chunk of chunks) {
        push({ type: "data", value: chunk });
      }
    };

    xhr.onload = () => {
      options.signal?.removeEventListener("abort", abortHandler);

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
        const body = (xhr.responseText || "").slice(0, 500);
        const detail = body ? `: ${body}` : "";
        const error = new Error(sseFailureMessage(xhr.status, xhr.statusText, detail));
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
      push({ type: "error", error: makeAbortError() });
      finished = true;
    };

    xhr.send(options.body !== undefined ? JSON.stringify(options.body) : undefined);
  }

  async function* createStream() {
    if (options.signal?.aborted) throw makeAbortError();
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
