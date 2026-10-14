# useBackup

> **useBackup**(`options`: `object`): [`UseBackupResult`](../Internal/interfaces/UseBackupResult.md)

Defined in: [src/react/useBackup.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#121)

Unified React hook for backup and restore functionality.

This hook provides methods to backup conversations to iCloud and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

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

`object`

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
import { useBackup } from "@anuma/sdk/react";

function BackupManager() {
  const { icloud, hasAnyProvider } = useBackup({
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  if (!hasAnyProvider) {
    return <p>No backup providers configured</p>;
  }

  return icloud.isAuthenticated ? (
    <>
      <button onClick={() => icloud.backup()}>Backup</button>
      <button onClick={() => icloud.restore()}>Restore</button>
      <button onClick={icloud.disconnect}>Disconnect</button>
    </>
  ) : (
    <button onClick={icloud.connect}>Connect iCloud</button>
  );
}
```
