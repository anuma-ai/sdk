# Overview

Helper utilities for integrating the `useChat` hook and
[Vercel AI Elements](https://ai-sdk.dev/elements).

The `@reverbia/sdk/vercel` package provides utilities to bridge the
Portal API with Vercel's AI SDK streaming format. This enables you to
use the Portal API as a backend while leveraging Vercel's `useChat` hook
and AI Elements components for the frontend.

## Why Use These Utilities?

Vercel's AI components expect a specific stream format for real-time UI updates.
These utilities handle the conversion between Portal API responses and the
Vercel stream format, so you can:

- Use `useChat` hook with Portal API completions
- Render responses with AI Elements components
- Handle errors gracefully in the streaming UI

## Functions

- [createAssistantStream](functions/createAssistantStream.md)
- [createErrorStream](functions/createErrorStream.md)
- [mapMessagesToCompletionPayload](functions/mapMessagesToCompletionPayload.md)
