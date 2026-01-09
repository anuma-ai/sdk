# Overview

Helper utilities for integrating the `useChat` hook and
[Vercel AI Elements](https://ai-sdk.dev/elements).

The `@reverbia/sdk/vercel` package provides utilities to bridge the
Portal API with Vercel's AI SDK streaming format. This enables you to
use Vercel's AI Elements components with the SDK's `useChat` hook.

## Why Use These Utilities?

Vercel's AI components expect a specific stream format for real-time UI updates.
These utilities handle the conversion between Portal API responses and the
Vercel stream format, so you can:

* Use Vercel AI Elements with the SDK's `useChat` hook
* Render responses with AI Elements components
* Handle errors gracefully in the streaming UI

## Functions

| Function | Description |
| ------ | ------ |
| [createAssistantStream](functions/createAssistantStream.md) | Creates a `ReadableStream` that emits the sequence of events expected by Vercel's `createUIMessageStreamResponse` helper for a successful assistant reply. |
| [createErrorStream](functions/createErrorStream.md) | Creates a `ReadableStream` that emits a single `error` event compatible with the Vercel AI stream contract. This allows Portal API errors to be surfaced directly in UI components that expect streamed assistant output. |
| [mapMessagesToCompletionPayload](functions/mapMessagesToCompletionPayload.md) | Converts an array of Vercel AI UIMessage objects into the `LlmapiMessage` format that the Portal API expects. |
