/**
 * Polyfills for React Native compatibility.
 *
 * Import this module early in your React Native app to ensure
 * all necessary polyfills are installed before using the SDK.
 *
 * @example
 * ```typescript
 * // In your app's entry point (e.g., App.tsx or index.js)
 * import "@reverbia/sdk/polyfills";
 * ```
 */

// TextDecoderStream polyfill for SSE streaming
import "./textDecoderStream";

export { needsPolyfill as needsTextDecoderStreamPolyfill } from "./textDecoderStream";
