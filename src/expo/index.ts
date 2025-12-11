/**
 * React Native hooks for building AI-powered mobile applications.
 *
 * The `@reverbia/sdk/expo` package provides React hooks optimized for
 * Expo and React Native environments. These hooks exclude web-only
 * dependencies (like pdfjs-dist and @huggingface/transformers) that
 * aren't compatible with React Native.
 *
 * ## Differences from React Package
 *
 * The Expo package is a lightweight subset of `@reverbia/sdk/react`:
 *
 * - No local/in-browser AI models (requires web APIs)
 * - No PDF text extraction (pdfjs-dist is web-only)
 * - No OCR/image text extraction (transformers.js is web-only)
 * - No client-side tool execution
 * - Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)
 *
 * ## Quick Start
 *
 * ```tsx
 * import { useChat } from "@reverbia/sdk/expo";
 *
 * function ChatScreen() {
 *   const { isLoading, sendMessage, stop } = useChat({
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => setResponse((prev) => prev + chunk),
 *   });
 *
 *   const handleSend = async () => {
 *     await sendMessage({
 *       messages: [{ role: "user", content: [{ type: "text", text: input }] }],
 *       model: "gpt-4o-mini",
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleSend} disabled={isLoading} title="Send" />
 *       {isLoading && <Button onPress={stop} title="Stop" />}
 *     </View>
 *   );
 * }
 * ```
 *
 * @module
 */

export { useChat } from "./useChat";
export { useImageGeneration } from "../react/useImageGeneration";
export { useModels } from "../react/useModels";
export type { UseModelsOptions, UseModelsResult } from "../react/useModels";
