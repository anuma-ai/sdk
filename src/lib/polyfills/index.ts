/**
 * # Polyfills for React Native/Expo Compatibility
 *
 * This module provides polyfills required for streaming support in React Native
 * environments. It includes `TextDecoderStream` which is needed for SSE (Server-Sent
 * Events) streaming but is not available in React Native by default.
 *
 * ## Installation
 *
 * First, install the required dependencies:
 *
 * ```bash
 * pnpm install @reverbia/sdk@next web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
 * ```
 *
 * ## Setup
 *
 * Create a custom entry point file (e.g., `entrypoint.js`) and update your
 * `package.json` to use it:
 *
 * ```json
 * {
 *   "main": "entrypoint.js"
 * }
 * ```
 *
 * In your entrypoint file, import polyfills in this exact order:
 *
 * ```javascript
 * // entrypoint.js
 *
 * // Import polyfills in this exact order
 * import "react-native-get-random-values";
 * import "@ethersproject/shims";
 * import { Buffer } from "buffer";
 * global.Buffer = Buffer;
 *
 * // Web Streams polyfill for SSE streaming
 * import { ReadableStream, TransformStream } from "web-streams-polyfill";
 * if (typeof globalThis.ReadableStream === "undefined") {
 *   globalThis.ReadableStream = ReadableStream;
 * }
 * if (typeof globalThis.TransformStream === "undefined") {
 *   globalThis.TransformStream = TransformStream;
 * }
 *
 * // SDK polyfills (TextDecoderStream for streaming)
 * import "@reverbia/sdk/polyfills";
 *
 * // Then import expo router
 * import "expo-router/entry";
 * ```
 *
 * ## Why These Polyfills?
 *
 * - **react-native-get-random-values**: Provides `crypto.getRandomValues()` for encryption
 * - **@ethersproject/shims**: Ethereum wallet compatibility
 * - **buffer**: Node.js Buffer API for React Native
 * - **web-streams-polyfill**: ReadableStream and TransformStream for streaming
 * - **@reverbia/sdk/polyfills**: TextDecoderStream for SSE text decoding
 *
 * ## Usage in Expo
 *
 * After setting up polyfills, import hooks from `@reverbia/sdk/expo`:
 *
 * ```typescript
 * import { useChat } from "@reverbia/sdk/expo";
 *
 * function ChatComponent() {
 *   const { sendMessage, isLoading } = useChat({
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => console.log(chunk),
 *   });
 * }
 * ```
 *
 * @module
 */

// TextDecoderStream polyfill for SSE streaming
import "./textDecoderStream";

export { needsPolyfill as needsTextDecoderStreamPolyfill } from "./textDecoderStream";
