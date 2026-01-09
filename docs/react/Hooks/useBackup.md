# useBackup

> **useBackup**(`options`: `object`): [`UseBackupResult`](../Internal/interfaces/UseBackupResult.md)

Defined in: [src/react/useBackup.ts:182](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L182)

Unified React hook for backup and restore functionality.

This hook provides methods to backup conversations to both Dropbox and Google Drive,
and restore them. It handles all the logic for checking timestamps, skipping
unchanged files, authentication, and managing the backup/restore process.

Must be used within a BackupAuthProvider.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

{ `database`: `Database`; `dropboxFolder?`: `string`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `googleConversationsFolder?`: `string`; `googleRootFolder?`: `string`; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `userAddress`: `string` | `null`; }

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.database`

</td>
<td>

`Database`

</td>
<td>

WatermelonDB database instance

</td>
</tr>
<tr>
<td>

`options.dropboxFolder?`

</td>
<td>

`string`

</td>
<td>

Dropbox folder path for backups (default: '/ai-chat-app/conversations')

</td>
</tr>
<tr>
<td>

`options.exportConversation`

</td>
<td>

(`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>

</td>
<td>

Export a conversation to an encrypted blob

</td>
</tr>
<tr>
<td>

`options.googleConversationsFolder?`

</td>
<td>

`string`

</td>
<td>

Google Drive conversations subfolder (default: 'conversations')

</td>
</tr>
<tr>
<td>

`options.googleRootFolder?`

</td>
<td>

`string`

</td>
<td>

Google Drive root folder name (default: 'ai-chat-app')

</td>
</tr>
<tr>
<td>

`options.importConversation`

</td>
<td>

(`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>

</td>
<td>

Import a conversation from an encrypted blob

</td>
</tr>
<tr>
<td>

`options.requestEncryptionKey`

</td>
<td>

(`address`: `string`) => `Promise`<`void`>

</td>
<td>

Request encryption key for the user address

</td>
</tr>
<tr>
<td>

`options.userAddress`

</td>
<td>

`string` | `null`

</td>
<td>

Current user address (null if not signed in)

</td>
</tr>
</tbody>
</table>

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
