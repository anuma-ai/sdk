# Migration Guide: Backup OAuth Flow Upgrade

This guide explains how to migrate from the implicit OAuth flow to the new authorization code flow with refresh tokens for Google Drive and Dropbox backup.

## What Changed

### Before (Implicit Flow)
- Access tokens expired in ~1 hour
- Users had to re-authorize every session
- Token exchange happened directly in the browser (PKCE for Dropbox)
- Google Drive auth required custom implementation in the app

### After (Authorization Code Flow)
- Refresh tokens enable "authorize once, sync forever"
- Token exchange happens on the backend (more secure)
- Silent token refresh when access token expires
- Built-in `GoogleDriveAuthProvider` matching `DropboxAuthProvider` pattern
- New unified `BackupAuthProvider` combines both providers

---

## Migration Steps

### Option 1: Use the Unified Provider (Recommended)

Replace separate providers with a single `BackupAuthProvider`:

**Before:**
```tsx
// You may have had separate implementations or just Dropbox
<DropboxAuthProvider
  appKey={DROPBOX_APP_KEY}
  callbackPath="/auth/dropbox/callback"
>
  {/* Custom Google auth implementation */}
  <App />
</DropboxAuthProvider>
```

**After:**
```tsx
import { BackupAuthProvider } from "@reverbia/sdk/react";

<BackupAuthProvider
  dropboxAppKey={process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}
  dropboxCallbackPath="/auth/dropbox/callback"
  googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
  googleCallbackPath="/auth/google/callback"
  apiClient={apiClient}  // NEW: Required for backend token exchange
>
  <App />
</BackupAuthProvider>
```

Then use the unified `useBackup` hook:

```tsx
import { useBackup } from "@reverbia/sdk/react";

function BackupManager() {
  const { dropbox, googleDrive, hasAnyProvider, disconnectAll } = useBackup({
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  return (
    <div>
      {/* Dropbox */}
      {dropbox.isConfigured && (
        dropbox.isAuthenticated ? (
          <>
            <button onClick={() => dropbox.backup()}>Backup to Dropbox</button>
            <button onClick={() => dropbox.restore()}>Restore from Dropbox</button>
            <button onClick={dropbox.disconnect}>Disconnect</button>
          </>
        ) : (
          <button onClick={dropbox.connect}>Connect Dropbox</button>
        )
      )}

      {/* Google Drive */}
      {googleDrive.isConfigured && (
        googleDrive.isAuthenticated ? (
          <>
            <button onClick={() => googleDrive.backup()}>Backup to Google Drive</button>
            <button onClick={() => googleDrive.restore()}>Restore from Google Drive</button>
            <button onClick={googleDrive.disconnect}>Disconnect</button>
          </>
        ) : (
          <button onClick={googleDrive.connect}>Connect Google Drive</button>
        )
      )}
    </div>
  );
}
```

---

### Option 2: Use Individual Providers

If you prefer separate providers, you can still use them individually.

#### Dropbox Changes

**Before:**
```tsx
<DropboxAuthProvider
  appKey={DROPBOX_APP_KEY}
  callbackPath="/auth/dropbox/callback"
>
```

**After:**
```tsx
<DropboxAuthProvider
  appKey={DROPBOX_APP_KEY}
  callbackPath="/auth/dropbox/callback"
  apiClient={apiClient}  // NEW: Required for backend token exchange
>
```

The `useDropboxAuth` hook API changed slightly:

```tsx
// Before
const { logout } = useDropboxAuth();
logout(); // was synchronous

// After
const { logout, refreshToken } = useDropboxAuth();
await logout(); // now async (revokes token on backend)
await refreshToken(); // NEW: manually refresh token
```

#### Google Drive Changes

**Before (custom implementation required):**
```tsx
// You had to implement Google auth yourself
const { accessToken, requestDriveAccess } = useCustomGoogleAuth();

const { backup, restore } = useGoogleDriveBackup({
  database,
  userAddress,
  accessToken,           // Had to pass token
  requestDriveAccess,    // Had to pass auth function
  requestEncryptionKey,
  exportConversation,
  importConversation,
});
```

**After (built-in provider):**
```tsx
import {
  GoogleDriveAuthProvider,
  useGoogleDriveBackup
} from "@reverbia/sdk/react";

// Wrap with provider
<GoogleDriveAuthProvider
  clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
  callbackPath="/auth/google/callback"
  apiClient={apiClient}
>
  <App />
</GoogleDriveAuthProvider>

// Use the hook (no longer needs accessToken or requestDriveAccess)
function BackupComponent() {
  const { backup, restore, isConfigured, isAuthenticated } = useGoogleDriveBackup({
    database,
    userAddress,
    // accessToken - REMOVED
    // requestDriveAccess - REMOVED
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  // isConfigured is NEW - check if clientId is provided
}
```

---

## API Changes Summary

### DropboxAuthProvider

| Prop | Before | After |
|------|--------|-------|
| `appKey` | Required | Required |
| `callbackPath` | Optional | Optional |
| `apiClient` | N/A | **NEW** - Required for backend token exchange |

### DropboxAuthContextValue (from useDropboxAuth)

| Property | Before | After |
|----------|--------|-------|
| `logout` | `() => void` | `() => Promise<void>` (async) |
| `refreshToken` | N/A | **NEW** `() => Promise<string \| null>` |

### UseGoogleDriveBackupOptions

| Option | Before | After |
|--------|--------|-------|
| `accessToken` | Required | **REMOVED** (handled by provider) |
| `requestDriveAccess` | Required | **REMOVED** (handled by provider) |

### UseGoogleDriveBackupResult

| Property | Before | After |
|----------|--------|-------|
| `isConfigured` | N/A | **NEW** - whether clientId is provided |

---

## New Exports

```tsx
// New Google Drive auth provider (matches Dropbox pattern)
import {
  GoogleDriveAuthProvider,
  useGoogleDriveAuth,
  getGoogleDriveStoredToken,
  clearGoogleDriveToken,
  hasGoogleDriveCredentials,
} from "@reverbia/sdk/react";

// New unified backup provider and hooks
import {
  BackupAuthProvider,
  useBackupAuth,
  useBackup,
} from "@reverbia/sdk/react";

// New Dropbox export
import { hasDropboxCredentials } from "@reverbia/sdk/react";
```

---

## Backend Requirements

The new authorization code flow requires backend endpoints for token exchange. Your API must implement:

- `POST /auth/oauth/{provider}/exchange` - Exchange auth code for tokens
- `POST /auth/oauth/{provider}/refresh` - Refresh expired access token
- `POST /auth/oauth/{provider}/revoke` - Revoke tokens on logout

Where `{provider}` is `google-drive` or `dropbox`.

These endpoints should:
1. Accept the authorization code from the frontend
2. Exchange it with the OAuth provider using your client secret
3. Return access token, refresh token, and expiration info

---

## Token Storage Changes

- **Before**: Tokens stored in `sessionStorage` (cleared on tab close)
- **After**: Tokens stored in `localStorage` (persisted across sessions)

Storage keys:
- `oauth_token_dropbox` - Dropbox tokens
- `oauth_token_google-drive` - Google Drive tokens

Each stores:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": 1234567890000,
  "scope": "..."
}
```

---

## Clearing Old Tokens

After upgrading, users' old session storage tokens will be ignored. They'll need to re-authorize once with the new flow, after which they'll have persistent refresh tokens.

To manually clear old tokens during migration:
```tsx
// Clear old sessionStorage tokens (optional cleanup)
if (typeof window !== 'undefined') {
  sessionStorage.removeItem('dropbox_access_token');
  sessionStorage.removeItem('dropbox_code_verifier');
}
```
