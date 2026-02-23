# useICloudBackup

> **useICloudBackup**(`options`: `object`): [`UseICloudBackupResult`](../Internal/interfaces/UseICloudBackupResult.md)

Defined in: [src/react/useICloudBackup.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L103)

React hook for iCloud backup and restore functionality.

This hook provides methods to backup conversations to iCloud and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

Must be used within an ICloudAuthProvider.

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

[`UseICloudBackupResult`](../Internal/interfaces/UseICloudBackupResult.md)

## Example

```tsx
import { useICloudBackup } from "@reverbia/sdk/react";

function BackupButton() {
  const { backup, restore, isConfigured, isAuthenticated, isAvailable } = useICloudBackup({
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  if (!isAvailable) {
    return <p>CloudKit JS not loaded</p>;
  }

  const handleBackup = async () => {
    const result = await backup({
      onProgress: (current, total) => {
        console.log(`Progress: ${current}/${total}`);
      },
    });

    if ("error" in result) {
      console.error(result.error);
    } else {
      console.log(`Uploaded: ${result.uploaded}, Skipped: ${result.skipped}`);
    }
  };

  return <button onClick={handleBackup} disabled={!isConfigured}>Backup to iCloud</button>;
}
```
