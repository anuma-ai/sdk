# Full User Data Encryption for Chat Storage

## Overview

This PR implements comprehensive encryption for all user chat data, enabling wallet-based data isolation and end-to-end encryption of sensitive information. All user data is encrypted at rest, with embedding vectors kept unencrypted to maintain semantic search functionality.

## Key Features

### 🔐 End-to-End Encryption
- **Sensitive fields encrypted**: `content`, `title`, `error`, `thinking`, `files` (JSON), `thoughtProcess` (JSON)
- **Fields kept unencrypted**: `vector` (embeddings), `embedding_model`, `role`, `model`, `usage`, `sources`, `responseDuration`, `wasStopped`, `messageId`, `conversationId`, timestamps
- **Encryption methods**:
  - **Deterministic encryption** (AES-GCM with deterministic IV): Used for queryable fields like `title` - same plaintext + address always produces same ciphertext
  - **Non-deterministic encryption** (AES-GCM with random IV): Used for content fields - each encryption produces different ciphertext

### 🔒 Wallet-Based Data Isolation
- All chat operations are scoped to a `wallet_address`
- Users can only access their own conversations and messages
- Database queries automatically filter by `wallet_address`
- Prevents cross-user data leakage

### 📦 Zero Data Loss Migration
- Existing chat history is preserved during migration
- Orphan data (pre-migration data with empty `wallet_address`) is automatically claimed and encrypted when the first user logs in
- Transparent migration process - no user action required

## Changes

### Database Schema Updates

**Chat Schema (v5 → v6)**:
- Added `wallet_address` column to `history` and `conversations` tables (indexed)
- Migration preserves existing data with empty `wallet_address` marker

**SDK Schema (v9 → v10)**:
- Added `wallet_address` columns to unified schema
- Updated migration to preserve existing data

### New Encryption Module

**`src/lib/db/chat/encryption.ts`** (281 lines):
- `encryptMessageFields()` - Encrypts all sensitive message fields
- `decryptMessageFields()` - Decrypts message fields on read
- `encryptConversationFields()` - Encrypts conversation titles (deterministic)
- `decryptConversationFields()` - Decrypts conversation titles
- `encryptJsonString()` / `decryptJsonString()` - Handles JSON field encryption (files, thoughtProcess)
- `isEncrypted()` - Checks if a value is already encrypted (prevents double encryption)

### Updated Operations

**`src/lib/db/chat/operations.ts`** (491 lines changed):
- All operations now require `walletAddress` parameter
- All queries filter by `wallet_address` for data isolation
- `messageToStored()` and `conversationToStored()` now async and handle decryption
- `createMessageOp()` and `createConversationOp()` encrypt fields before storage
- `updateMessageOp()` and `updateConversationTitleOp()` encrypt updated fields
- `claimOrphanDataOp()` - New function to claim and encrypt orphan data during migration

### Hook Updates

**`src/react/useChatStorage.ts`** (206 lines changed):
- Added `walletAddress`, `signMessage`, `embeddedWalletSigner` to options
- Automatic encryption key request before write operations
- Automatic orphan data claiming on mount when encryption context available
- All operation calls updated to pass `walletAddress`

**`src/expo/useChatStorage.ts`** (198 lines changed):
- Same updates as React version for Expo compatibility
- Conditional import of `requestEncryptionKey` for Expo environment

### Backup Functions Updated

**`src/lib/backup/dropbox/backup.ts`**, **`src/lib/backup/google/backup.ts`**, **`src/lib/backup/icloud/backup.ts`**:
- Updated to handle async `conversationToStored()` function
- Added wallet filtering to conversation queries
- Create `StorageOperationsContext` with wallet address for decryption

### Model Updates

**`src/lib/db/chat/models.ts`**:
- Added `walletAddress` field to `Message` and `Conversation` models

## Migration Strategy

### Phase 1: Schema Migration
1. Migration adds `wallet_address` column with empty string default
2. Existing data is preserved with `wallet_address = ""` (orphan marker)
3. No data is deleted during migration

### Phase 2: Orphan Data Claiming
1. When a user logs in with `walletAddress` and `signMessage`, the hook automatically:
   - Finds all orphan conversations and messages (`wallet_address = ""`)
   - Encrypts all sensitive fields using the user's encryption key
   - Updates `wallet_address` to the user's address
2. This happens transparently on first access - no user action required
3. Subsequent operations work normally with encrypted, wallet-scoped data

## Security Considerations

### Encryption Key Derivation
- Keys are derived from wallet signatures using PBKDF2
- Same wallet address + signature = same encryption key
- Keys are cached in memory and can be persisted (with user consent)

### Data Isolation
- All database queries include `wallet_address` filter
- Prevents SQL injection from accessing other users' data
- Message ownership verified before updates

### Backwards Compatibility
- Graceful fallback if encryption fails (stores as plaintext with warning)
- Handles both encrypted and unencrypted data during transition period
- `isEncrypted()` check prevents double encryption

## API Changes

### Breaking Changes
- `BaseUseChatStorageOptions` now requires `walletAddress` for encryption
- All operation functions require `walletAddress` parameter
- `messageToStored()` and `conversationToStored()` are now async

### New Options
```typescript
interface UseChatStorageOptions {
  walletAddress?: string;  // Required for encryption
  signMessage?: SignMessageFn;  // Required for encryption key derivation
  embeddedWalletSigner?: EmbeddedWalletSignerFn;  // Optional, for silent signing
  // ... other options
}
```

### New Exports
- `claimOrphanDataOp()` - Manual orphan data claiming (exported for advanced use cases)

## Testing

- ✅ Build passes (TypeScript compilation)
- ✅ Type checking passes
- ✅ Documentation generated successfully
- ✅ No linter errors

## Files Changed

**31 files changed, 1,379 insertions(+), 228 deletions(-)**

### Core Changes
- `src/lib/db/chat/encryption.ts` - New encryption module (281 lines)
- `src/lib/db/chat/operations.ts` - Updated with encryption and wallet filtering (491 lines changed)
- `src/lib/db/chat/schema.ts` - Schema migration updates
- `src/lib/db/schema.ts` - Unified schema migration updates
- `src/lib/db/chat/models.ts` - Added walletAddress field

### Hook Updates
- `src/react/useChatStorage.ts` - React hook with encryption support (206 lines changed)
- `src/expo/useChatStorage.ts` - Expo hook with encryption support (198 lines changed)

### Backup Updates
- `src/lib/backup/dropbox/backup.ts` - Updated for async and wallet filtering
- `src/lib/backup/google/backup.ts` - Updated for async and wallet filtering
- `src/lib/backup/icloud/backup.ts` - Updated for async and wallet filtering

### Documentation
- All TypeDoc documentation regenerated (19 files updated)

## Benefits

1. **Privacy**: All user data encrypted at rest
2. **Security**: Wallet-based isolation prevents cross-user data access
3. **Zero Data Loss**: Existing chat history preserved and migrated automatically
4. **Transparent**: Migration happens automatically - no user action required
5. **Backwards Compatible**: Graceful handling of unencrypted data during transition
6. **Search Preserved**: Embedding vectors remain unencrypted for semantic search

## Future Considerations

- Consider adding migration status tracking to prevent multiple users from claiming orphan data simultaneously
- May want to add admin function to manually assign orphan data to specific users
- Consider adding encryption status indicator in UI

## Related Issues

This PR enables full encryption of user data as part of the broader data privacy initiative. It builds on the existing memory encryption pattern and extends it to chat storage.
