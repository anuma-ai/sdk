import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: {
      // Set NODE_ENV to 'test' so rate limiting is bypassed for mock signatures
      NODE_ENV: 'test',
    },
  },
});
