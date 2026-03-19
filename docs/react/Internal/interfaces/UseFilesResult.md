# UseFilesResult

Defined in: [src/react/useFiles.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#66)

Result returned by useFiles hook.

## Properties

### createBlobUrl()

> **createBlobUrl**: (`mediaId`: `string`) => `Promise`<`string` | `null`>

Defined in: [src/react/useFiles.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#135)

Create a blob URL for a file (auto-managed lifecycle)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>

***

### createMedia()

> **createMedia**: (`options`: [`CreateMediaOptions`](CreateMediaOptions.md)) => `Promise`<[`StoredMedia`](StoredMedia.md)>

Defined in: [src/react/useFiles.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#75)

Create a new file record

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

[`CreateMediaOptions`](CreateMediaOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)>

***

### createMediaBatch()

> **createMediaBatch**: (`optionsArray`: [`CreateMediaOptions`](CreateMediaOptions.md)\[]) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#77)

Create multiple file records in a batch

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`optionsArray`

</td>
<td>

[`CreateMediaOptions`](CreateMediaOptions.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### deleteMedia()

> **deleteMedia**: (`mediaId`: `string`) => `Promise`<`boolean`>

Defined in: [src/react/useFiles.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#91)

Soft delete a file record

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### deleteMediaByConversation()

> **deleteMediaByConversation**: (`conversationId`: `string`) => `Promise`<`number`>

Defined in: [src/react/useFiles.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#127)

Delete all files for a conversation

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`conversationId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`number`>

***

### deleteMediaByMessage()

> **deleteMediaByMessage**: (`messageId`: `string`) => `Promise`<`number`>

Defined in: [src/react/useFiles.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#129)

Delete all files for a message

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`messageId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`number`>

***

### getAIGeneratedMedia()

> **getAIGeneratedMedia**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#113)

Get AI-generated files

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getAudio()

> **getAudio**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#105)

Get all audio files

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getDocuments()

> **getDocuments**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#107)

Get all documents

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getImages()

> **getImages**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#101)

Get all images

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMedia()

> **getMedia**: (`filters`: [`MediaFilterOptions`](MediaFilterOptions.md)) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#97)

Get all files with optional filters

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`filters`

</td>
<td>

[`MediaFilterOptions`](MediaFilterOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMediaByConversation()

> **getMediaByConversation**: (`conversationId`: `string`, `limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:109](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#109)

Get files by conversation

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMediaById()

> **getMediaById**: (`mediaId`: `string`) => `Promise`<[`StoredMedia`](StoredMedia.md) | `null`>

Defined in: [src/react/useFiles.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#79)

Get a file record by its media\_id

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md) | `null`>

***

### getMediaByIds()

> **getMediaByIds**: (`mediaIds`: `string`\[], `includeDeleted?`: `boolean`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#83)

Get files by an array of media IDs

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaIds`

</td>
<td>

`string`\[]

</td>
</tr>
<tr>
<td>

`includeDeleted?`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMediaByMessage()

> **getMediaByMessage**: (`messageId`: `string`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#85)

Get files by message ID

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`messageId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMediaByModel()

> **getMediaByModel**: (`model`: `string`, `limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#117)

Get files by AI model

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`model`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMediaByRole()

> **getMediaByRole**: (`role`: [`MediaRole`](../type-aliases/MediaRole.md), `limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#111)

Get files by role (user uploads vs AI generated)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`role`

</td>
<td>

[`MediaRole`](../type-aliases/MediaRole.md)

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMediaBySourceUrl()

> **getMediaBySourceUrl**: (`sourceUrl`: `string`) => `Promise`<[`StoredMedia`](StoredMedia.md) | `null`>

Defined in: [src/react/useFiles.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#81)

Get a file record by its source URL

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`sourceUrl`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md) | `null`>

***

### getMediaByType()

> **getMediaByType**: (`mediaType`: [`MediaType`](../type-aliases/MediaType.md), `limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#99)

Get files by type

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaType`

</td>
<td>

[`MediaType`](../type-aliases/MediaType.md)

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getMediaCount()

> **getMediaCount**: (`mediaType?`: [`MediaType`](../type-aliases/MediaType.md)) => `Promise`<`number`>

Defined in: [src/react/useFiles.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#123)

Get file count

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaType?`

</td>
<td>

[`MediaType`](../type-aliases/MediaType.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`number`>

***

### getMediaCountsByType()

> **getMediaCountsByType**: () => `Promise`<`Record`<[`MediaType`](../type-aliases/MediaType.md), `number`>>

Defined in: [src/react/useFiles.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#125)

Get file counts by type

**Returns**

`Promise`<`Record`<[`MediaType`](../type-aliases/MediaType.md), `number`>>

***

### getRecentMedia()

> **getRecentMedia**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#119)

Get recent files for library homepage

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getUserUploadedMedia()

> **getUserUploadedMedia**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#115)

Get user-uploaded files

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### getVideos()

> **getVideos**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#103)

Get all videos

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### hardDeleteMedia()

> **hardDeleteMedia**: (`mediaId`: `string`) => `Promise`<`boolean`>

Defined in: [src/react/useFiles.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#93)

Permanently delete a file record

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/react/useFiles.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#71)

Whether files are being loaded

***

### isReady

> **isReady**: `boolean`

Defined in: [src/react/useFiles.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#69)

Whether the file system is ready (database table exists)

***

### readFile()

> **readFile**: (`mediaId`: `string`) => `Promise`<`File`>

Defined in: [src/react/useFiles.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#133)

Read a file from OPFS by its media ID

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`File`>

***

### resolveFilePlaceholders()

> **resolveFilePlaceholders**: (`content`: `string`) => `Promise`<`string`>

Defined in: [src/react/useFiles.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#141)

Resolve **SDKFILE** placeholders in content to blob URLs

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`content`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>

***

### revokeAllBlobUrls()

> **revokeAllBlobUrls**: () => `void`

Defined in: [src/react/useFiles.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#139)

Revoke all blob URLs (cleanup)

**Returns**

`void`

***

### revokeBlobUrl()

> **revokeBlobUrl**: (`mediaId`: `string`) => `void`

Defined in: [src/react/useFiles.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#137)

Revoke a specific blob URL

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### searchMedia()

> **searchMedia**: (`query`: `string`, `limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#121)

Search files by name

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`limit?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md)\[]>

***

### updateMedia()

> **updateMedia**: (`mediaId`: `string`, `options`: [`UpdateMediaOptions`](UpdateMediaOptions.md)) => `Promise`<[`StoredMedia`](StoredMedia.md) | `null`>

Defined in: [src/react/useFiles.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#87)

Update a file record

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`UpdateMediaOptions`](UpdateMediaOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredMedia`](StoredMedia.md) | `null`>

***

### updateMediaMessageIdBatch()

> **updateMediaMessageIdBatch**: (`mediaIds`: `string`\[], `messageId`: `string`) => `Promise`<`number`>

Defined in: [src/react/useFiles.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#89)

Batch update file records with a messageId

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`mediaIds`

</td>
<td>

`string`\[]

</td>
</tr>
<tr>
<td>

`messageId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`number`>
