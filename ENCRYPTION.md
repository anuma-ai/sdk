# Encryption at Rest - Migration Guide

This guide explains how to enable field-level encryption at rest in applications using `@reverbia/sdk`. All sensitive data stored in IndexedDB (messages, conversation titles, media metadata) is encrypted using AES-GCM with wallet-derived keys.

## Overview

**What gets encrypted:**

| Data | Fields Encrypted | Encryption Type |
|------|-----------------|-----------------|
| Messages | `content`, `thinking`, `vector`, `chunks`, `sources`, `thoughtProcess` | Random IV (AES-GCM) |
| Conversations | `title` | Random IV (AES-GCM) |
| Media | `name`, `sourceUrl`, `metadata` | Random IV (AES-GCM) |
| Memory | `namespace`, `key`, `value`, `rawEvidence` | Deterministic (AES-GCM) |
| Files (OPFS) | Entire file content | Random IV (AES-GCM) |

**What is NOT encrypted** (by design):

- IDs (`conversationId`, `messageId`, `mediaId`, `walletAddress`)
- Roles, models, MIME types
- Timestamps, token counts, flags (`isDeleted`, `wasStopped`, `error`)
- Dimensions, duration, file sizes
- Embeddings stored via `updateMessageEmbeddingOp` / `updateMessageChunksOp` (needed for vector search)

## Quick Start

### Minimum Change (React)

Pass `walletAddress` and `signMessage` to `useChatStorage`:

```tsx
import { useChatStorage } from "@reverbia/sdk/react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

function Chat({ database }) {
  const { user, signMessage } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(w => w.walletClientType === "privy");

  // Create silent signer for embedded wallets (no confirmation modal)
  const embeddedSigner = useCallback(async (message, options) => {
    if (!embeddedWallet) throw new Error("No embedded wallet");
    return embeddedWallet.sign(message);
  }, [embeddedWallet]);

  const {
    sendMessage,
    getMessages,
    flushQueue,
    clearQueue,
    queueStatus,
    // ... other fields unchanged
  } = useChatStorage({
    database,
    getToken: () => getAuthToken(),

    // These three fields enable encryption:
    walletAddress: user?.wallet?.address,
    signMessage,
    embeddedWalletSigner: embeddedSigner,
  });

  // Everything else works exactly the same.
  // Messages are transparently encrypted on write and decrypted on read.
}
```

That's it. No other code changes are needed.

### Minimum Change (Expo / React Native)

```tsx
import { useChatStorage } from "@reverbia/sdk/expo";

const {
  sendMessage,
  flushQueue,
  clearQueue,
  queueStatus,
} = useChatStorage({
  database,
  getToken: () => getAuthToken(),

  // Enable encryption:
  walletAddress: user?.wallet?.address,
  signMessage,
  embeddedWalletSigner: embeddedSigner,
});
```

## How It Works

### Encryption Flow

1. **Key derivation:** When `walletAddress` + `signMessage` are provided, the SDK asks the wallet to sign a fixed message. The signature is processed through **HKDF** (HMAC-based Key Derivation Function) with the domain-specific info string `reverbia-sdk-aes-gcm-v3` to produce a 32-byte AES-GCM key. A legacy SHA-256 key is also derived for reading old `enc:v2:` data. Both keys are held **in memory only** (never persisted to disk).

2. **Write path:** Before writing to WatermelonDB, sensitive fields are encrypted with a random 12-byte IV and prefixed with `enc:v3:`. Non-sensitive fields pass through unchanged.

3. **Read path:** After reading from WatermelonDB, the prefix determines which key to use:
   - `enc:v3:` → HKDF-derived key (current)
   - `enc:v2:` → SHA-256-derived key (legacy)
   - No prefix → plaintext (returned as-is)

4. **Session-scoped:** Keys are cleared on page reload. The user must re-authenticate each session for the key to be re-derived. This is a security feature, not a bug.

### Key Derivation (v3)

The current key derivation uses HKDF for proper key derivation and domain separation:

```
Signature → SHA-256(signature) → HKDF-Extract(IKM=hash, salt=zeros) → HKDF-Expand(info="reverbia-sdk-aes-gcm-v3") → 256-bit AES key
```

This prevents cross-app key reuse: even if another app asks the same wallet to sign the same message, the derived key will be different because the HKDF info string is app-specific.

### v2 → v3 Migration

Migration from `enc:v2:` (SHA-256 key) to `enc:v3:` (HKDF key) is **automatic and lazy**:

- **No batch migration needed.** Both keys are derived from the same signature on every session.
- **Reads work for both versions.** The prefix determines which key to use.
- **New writes always use v3.** As data is rewritten through normal CRUD operations, it naturally migrates.
- **Memory queries match both.** Deterministic queries use `Q.oneOf` to match v3, v2, and plaintext values.
- **OAuth tokens fall back.** If a token can't be decrypted with v3, the v2 key is tried automatically.

### Backwards Compatibility

Encryption is **fully backwards compatible**:

- **Old data reads correctly.** Plaintext fields (no `enc:v2:` prefix) are returned unchanged.
- **Mixed state works.** A conversation can contain some plaintext messages (written before encryption) and some encrypted messages (written after). Both read correctly.
- **No migration step.** There is no batch migration. Old data stays plaintext, new data is encrypted. The database gradually transitions as new data is written.
- **No schema changes.** Encrypted values are stored in the same columns as plaintext values. The `enc:v2:` prefix distinguishes them.

### What happens without `walletAddress`

If you don't pass `walletAddress` and `signMessage`, the SDK behaves exactly as before. All data is stored in plaintext. The new options are entirely additive.

## Write Queue

### Problem

Privy embedded wallets initialize asynchronously after signup. During this window, the encryption key is not yet available, but the user may already be interacting with the app.

### Solution

The SDK includes an in-memory write queue that holds database operations until the encryption key becomes available:

```
User sends message → Key not ready? → Queue in memory → Key ready → Auto-flush (encrypted)
                   → Key ready?     → Encrypt & write immediately
```

### Configuration

```tsx
useChatStorage({
  // ... other options

  // Queue is enabled by default when walletAddress is provided
  enableQueue: true,         // default: true
  autoFlushOnKeyAvailable: true, // default: true

  // For Privy embedded wallets: poll for wallet availability
  getWalletAddress: async () => {
    const wallet = wallets.find(w => w.walletClientType === "privy");
    return wallet?.address ?? null;
  },
});
```

### Queue API

The hook exposes three queue-related fields:

```tsx
const { flushQueue, clearQueue, queueStatus } = useChatStorage({ ... });

// queueStatus: { pending: number, failed: number, isFlushing: boolean, isPaused: boolean }

// Manual flush (usually not needed - auto-flush handles this)
await flushQueue();

// Discard all queued operations
clearQueue();
```

### Queue Behavior

- **In-memory only.** The queue is lost on page refresh. This is acceptable because the user must re-authenticate with Privy anyway.
- **Per-wallet isolation.** Each wallet address has its own queue.
- **Max 1000 operations.** Prevents memory leaks. Operations beyond the limit are rejected.
- **Dependency ordering.** Conversations are flushed before their messages (topological sort).
- **Retry logic.** Transient errors (network, timeout) are retried 3 times with exponential backoff (1s, 2s, 4s). Permanent errors (validation, encryption) fail immediately.
- **Auto-flush.** When the encryption key becomes available (via `requestEncryptionKey` or the embedded wallet poller), all queued operations are automatically flushed.

## Backup Interaction

### How backup works with encryption

The backup modules (Dropbox, Google Drive, iCloud) work through **dependency-injected callbacks**:

```typescript
interface BackupDeps {
  exportConversation: (conversationId: string, userAddress: string) => Promise<{ blob?: Blob }>;
  importConversation: (blob: Blob, userAddress: string) => Promise<{ success: boolean }>;
}
```

These callbacks are implemented in **your client app**, not in the SDK. The SDK backup modules only:
1. List conversations (using `conversationToStoredRaw` for timestamp comparison)
2. Call your `exportConversation` / `importConversation` callbacks
3. Upload/download blobs to cloud storage

### What you need to know

**Timestamp comparison works fine.** The backup skip-check uses `updatedAt` (a non-encrypted timestamp field), so it correctly identifies stale backups.

**Your `exportConversation` controls what gets backed up.** If your implementation reads messages through the SDK operations layer with encryption context, the data is decrypted before export. If you read raw WatermelonDB records, the backup contains `enc:v2:` prefixed ciphertext, which is fine since the backup itself is then encrypted at rest.

**Recommendation:** Read messages through the operations layer (which decrypts them), then re-encrypt the entire backup blob with the wallet key before uploading. This way:
- The backup is a single encrypted blob (not field-level encryption)
- Restoring on a new device works as long as the user has the same wallet
- The cloud provider never sees plaintext

## Advanced Usage

### Using `onKeyAvailable` directly

For custom integrations outside of `useChatStorage`:

```tsx
import { onKeyAvailable, requestEncryptionKey } from "@reverbia/sdk/react";

// Register a callback that fires when the key becomes available
const unsubscribe = onKeyAvailable(walletAddress, () => {
  console.log("Encryption key is ready!");
  // Trigger your own flush or initialization logic
});

// Later: clean up
unsubscribe();
```

### Using the queue manager directly

For advanced scenarios where you need to queue custom operations:

```tsx
import { queueManager } from "@reverbia/sdk/react";

// Queue a custom operation
const opId = queueManager.queueOperation(
  walletAddress,
  "createMessage",
  { conversationId: "conv-123", role: "user", content: "hello" },
  [], // dependencies (operation IDs that must complete first)
);

// Check status
const status = queueManager.getStatus(walletAddress);

// Listen for changes
const unsub = queueManager.onQueueChange(walletAddress, () => {
  console.log("Queue changed:", queueManager.getStatus(walletAddress));
});
```

### Wallet polling for Privy embedded wallets

If you need to detect wallet availability outside of `useChatStorage`:

```tsx
import { WalletPoller } from "@reverbia/sdk/react";

const poller = new WalletPoller();
const stopPolling = poller.startPolling(
  async () => {
    // Return address when ready, null when not
    const wallet = wallets.find(w => w.walletClientType === "privy");
    return wallet?.address ?? null;
  },
  (address) => {
    console.log("Wallet ready:", address);
  },
  1000,  // poll interval (ms)
  60,    // max attempts
);

// Later: stop polling
stopPolling();
```

## FAQ

### Does upgrading the SDK encrypt my existing data?

No. Old plaintext data stays plaintext. New data written after you pass `walletAddress` + `signMessage` is encrypted. Both coexist safely. There is no batch migration.

### What if the user loses their wallet?

The encryption key is derived from a wallet signature. If the wallet is lost, the key cannot be re-derived, and encrypted data cannot be read. This is by design for security. For recovery:
- Privy embedded wallets are recoverable through Privy's recovery flow
- External wallets: the user must have their own backup (seed phrase)

### Does `searchMediaOp` work with encrypted names?

Yes. The SDK fetches all media records, decrypts names in memory, and then filters. This is slower than SQL LIKE but works correctly with encrypted data.

### What about vector search (`searchMessagesOp`)?

Vector search works because embeddings stored via `updateMessageEmbeddingOp` / `updateMessageChunksOp` are **not encrypted**. These dedicated ops write embeddings in plaintext specifically so cosine similarity search works. However, when embeddings are passed as part of `createMessageOp` (via the `vector` field in `CreateMessageOptions`), they are encrypted along with other sensitive fields.

### Can I encrypt some conversations but not others?

No. Encryption is controlled at the hook level via `walletAddress`. All operations through a hook instance with `walletAddress` set will encrypt. To have unencrypted conversations, use a separate hook instance without `walletAddress`.

### What about multi-tab usage?

Each tab has its own encryption key in memory and its own queue. WatermelonDB handles cross-tab IndexedDB synchronization after data is written.

### Performance impact?

- **Encryption:** < 5ms per field (AES-GCM is hardware-accelerated in modern browsers)
- **Decryption of 50-message conversation:** < 500ms
- **Queue flush of 100 operations:** < 2s

### Is the key stored anywhere?

No. The AES-GCM key exists only in a JavaScript `Map` in memory. It is never written to `localStorage`, `IndexedDB`, cookies, or any persistent storage. On page reload, it is gone. The user must sign again to re-derive it.
