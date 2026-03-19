# xhrTransport

> `const` **xhrTransport**: `StreamingTransport`

Defined in: [src/lib/chat/xhrTransport.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/xhrTransport.ts#40)

XHR-based streaming transport for React Native environments.

React Native's `fetch` doesn't support `response.body` streaming,
so this transport uses `XMLHttpRequest` with `onprogress` to stream
SSE events. It exposes the same `{ stream: AsyncIterable }` interface
as the default fetch-based transport.
