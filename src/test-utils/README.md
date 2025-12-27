# Test Utilities

This directory contains utilities for testing encryption and signature functionality.

## Signature Mocking

By default, all tests use **mock signatures** that bypass rate limiting. This allows tests to run quickly without hitting Privy's rate limits (5 signatures per 60 seconds).

### Default Usage (Mock Signatures)

```typescript
import { getTestSignMessage } from "../test-utils/signature";

const TEST_SIGN_MESSAGE = getTestSignMessage();

// Use in tests - no rate limiting, deterministic results
await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);
```

### Live Signature Tests (Optional)

To run tests with real Privy signatures that respect rate limits:

1. Set the environment variable: `ENABLE_LIVE_SIGNATURE_TESTS=true`
2. Provide a real Privy `signMessage` function:

```typescript
import { getTestSignMessage } from "../test-utils/signature";
import { useSignMessage } from "@privy-io/react-auth";

// In your test setup
const { signMessage } = useSignMessage();
const TEST_SIGN_MESSAGE = getTestSignMessage(signMessage);

// Tests will now use real signatures and respect rate limits
// Rate limiter will automatically wait when limit is reached
```

### Rate Limiting

- **Mock signatures**: Rate limiting is automatically bypassed in test environments
- **Live signatures**: Rate limiter automatically waits when Privy's limit (5/60s) is reached
- Rate limiting is controlled by `NODE_ENV=test` in `vitest.config.ts`

## Utilities

### `createMockSignature(message: string): string`

Creates a deterministic mock signature based on the message content.

### `mockSignMessage: SignMessageFn`

A ready-to-use mock signature function.

### `getTestSignMessage(realSignMessage?: SignMessageFn): SignMessageFn`

Returns the appropriate signature function:
- Returns `mockSignMessage` by default
- Returns rate-limited live signature function if `ENABLE_LIVE_SIGNATURE_TESTS=true` and `realSignMessage` is provided

### `createLiveSignMessage(realSignMessage: SignMessageFn): SignMessageFn`

Creates a rate-limited wrapper around a real Privy `signMessage` function.

### `isLiveSignatureTestsEnabled(): boolean`

Checks if live signature tests are enabled via environment variable.

