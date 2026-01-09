# useBackup()

> **useBackup**(`options`: { `database`: `Database`; `dropboxFolder?`: `string`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `googleConversationsFolder?`: `string`; `googleRootFolder?`: `string`; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `userAddress`: `string` | `null`; }): [`UseBackupResult`](../Internal/interfaces/UseBackupResult.md)

Defined in: [src/react/useBackup.ts:182](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L182)

Unified React hook for backup and restore functionality.

This hook provides methods to backup conversations to both Dropbox and Google Drive,
and restore them. It handles all the logic for checking timestamps, skipping
unchanged files, authentication, and managing the backup/restore process.

Must be used within a BackupAuthProvider.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `database`: `Database`; `dropboxFolder?`: `string`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `googleConversationsFolder?`: `string`; `googleRootFolder?`: `string`; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `userAddress`: `string` | `null`; } | - |
| `options.database` | `Database` | WatermelonDB database instance |
| `options.dropboxFolder?` | `string` | Dropbox folder path for backups (default: '/ai-chat-app/conversations') |
| `options.exportConversation` | (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }> | Export a conversation to an encrypted blob |
| `options.googleConversationsFolder?` | `string` | Google Drive conversations subfolder (default: 'conversations') |
| `options.googleRootFolder?` | `string` | Google Drive root folder name (default: 'ai-chat-app') |
| `options.importConversation` | (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }> | Import a conversation from an encrypted blob |
| `options.requestEncryptionKey` | (`address`: `string`) => `Promise`<`void`> | Request encryption key for the user address |
| `options.userAddress` | `string` | `null` | Current user address (null if not signed in) |

## Returns

[`UseBackupResult`](../Internal/interfaces/UseBackupResult.md)

## Example

```tsx
import { useBackup } from "@reverbia/sdk/react";

function BackupManager() {
  const { dropbox, googleDrive, hasAnyProvider } = useBackup({
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  if (!hasAnyProvider) {
    return <p>No backup providers configured</p>;
  }

  return (
    <div>
      {dropbox.isConfigured && (
        <div>
          <h3>Dropbox</h3>
          {dropbox.isAuthenticated ? (
            <>
              <button onClick={() => dropbox.backup()}>Backup</button>
              <button onClick={() => dropbox.restore()}>Restore</button>
              <button onClick={dropbox.disconnect}>Disconnect</button>
            </>
          ) : (
            <button onClick={dropbox.connect}>Connect Dropbox</button>
          )}
        </div>
      )}

      {googleDrive.isConfigured && (
        <div>
          <h3>Google Drive</h3>
          {googleDrive.isAuthenticated ? (
            <>
              <button onClick={() => googleDrive.backup()}>Backup</button>
              <button onClick={() => googleDrive.restore()}>Restore</button>
              <button onClick={googleDrive.disconnect}>Disconnect</button>
            </>
          ) : (
            <button onClick={googleDrive.connect}>Connect Google Drive</button>
          )}
        </div>
      )}
    </div>
  );
}
```
