---
title: "@reverbia/sdk"
---

# AI SDK

A TypeScript SDK for interacting with ZetaChain's AI Portal API. This SDK
provides a type-safe, developer-friendly interface for building applications
that leverage AI chat completion capabilities.

## Overview

The AI SDK is an auto-generated TypeScript client library that wraps the
ZetaChain AI Portal REST API. It enables seamless integration of AI-powered chat
completion features into your applications with full TypeScript type safety and
modern async/await patterns.

## Features

- **Type-Safe API Client**: Fully typed interfaces generated from the OpenAPI
  specification, ensuring compile-time safety and excellent IDE autocomplete
  support
- **Chat Completions**: Generate AI-powered chat responses using configurable
  models and conversation history
- **Streaming Support**: Built-in support for streaming responses for real-time
  AI interactions
- **Health Monitoring**: Check service health and status to ensure reliable API
  connectivity
- **Flexible Configuration**: Customizable client instances with support for
  custom base URLs, authentication, and request/response interceptors
- **Error Handling**: Configurable error handling with support for throwing
  errors or returning error objects
- **Server-Sent Events**: Native support for SSE (Server-Sent Events) for
  real-time streaming capabilities

## Architecture

The SDK is automatically generated from the OpenAPI specification using
`@hey-api/openapi-ts`, ensuring it stays in sync with the latest API changes.
The generated client provides a clean, promise-based API that follows modern
JavaScript/TypeScript best practices.

## Use Cases

- Building AI-powered chatbots and conversational interfaces
- Integrating AI capabilities into web and mobile applications
- Creating applications that require natural language processing
- Developing tools that leverage large language models through ZetaChain's
  gateway
