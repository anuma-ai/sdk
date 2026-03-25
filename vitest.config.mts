import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      // Mock expo-crypto in tests - it's only needed in React Native environments
      "expo-crypto": new URL("./test/mocks/expo-crypto.ts", import.meta.url).pathname,
    },
  },
});
