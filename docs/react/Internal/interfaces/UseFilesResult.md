# UseFilesResult

Defined in: [src/react/useFiles.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#67)

Result returned by useFiles hook.

## Properties

### createBlobUrl()

> **createBlobUrl**: (`mediaId`: `string`) => `Promise`<`string` | `null`>

Defined in: [src/react/useFiles.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#142)

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

Defined in: [src/react/useFiles.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#76)

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

Defined in: [src/react/useFiles.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#78)

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

Defined in: [src/react/useFiles.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#98)

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

Defined in: [src/react/useFiles.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#134)

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

Defined in: [src/react/useFiles.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#136)

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

Defined in: [src/react/useFiles.ts:120](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#120)

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

Defined in: [src/react/useFiles.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#112)

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

Defined in: [src/react/useFiles.ts:114](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#114)

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

Defined in: [src/react/useFiles.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#108)

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

Defined in: [src/react/useFiles.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#104)

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

Defined in: [src/react/useFiles.ts:116](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#116)

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

Defined in: [src/react/useFiles.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#80)

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

Defined in: [src/react/useFiles.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#84)

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

Defined in: [src/react/useFiles.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#86)

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

Defined in: [src/react/useFiles.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#124)

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

Defined in: [src/react/useFiles.ts:118](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#118)

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

Defined in: [src/react/useFiles.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#82)

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

Defined in: [src/react/useFiles.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#106)

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

Defined in: [src/react/useFiles.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#130)

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

Defined in: [src/react/useFiles.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#132)

Get file counts by type

**Returns**

`Promise`<`Record`<[`MediaType`](../type-aliases/MediaType.md), `number`>>

***

### getRecentMedia()

> **getRecentMedia**: (`limit?`: `number`) => `Promise`<[`StoredMedia`](StoredMedia.md)\[]>

Defined in: [src/react/useFiles.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#126)

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

Defined in: [src/react/useFiles.ts:122](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#122)

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

Defined in: [src/react/useFiles.ts:110](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#110)

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

Defined in: [src/react/useFiles.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#100)

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

Defined in: [src/react/useFiles.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#72)

Whether files are being loaded

***

### isReady

> **isReady**: `boolean`

Defined in: [src/react/useFiles.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#70)

Whether the file system is ready (database table exists)

***

### readFile()

> **readFile**: (`mediaId`: `string`) => `Promise`<`File`>

Defined in: [src/react/useFiles.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#140)

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

### relinkMisclassifiedVideos()

> **relinkMisclassifiedVideos**: () => `Promise`<`number`>

Defined in: [src/react/useFiles.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#96)

One-time recovery: relink videos previously stored as images (media\_type
"image" but a video/\* mime) so they appear in the Videos tab and resolve in
the video player's OPFS fallback. Idempotent. Returns count relinked.

**Returns**

`Promise`<`number`>

***

### resolveFilePlaceholders()

> **resolveFilePlaceholders**: (`content`: `string`) => `Promise`<`string`>

Defined in: [src/react/useFiles.ts:148](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#148)

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

Defined in: [src/react/useFiles.ts:146](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#146)

Revoke all blob URLs (cleanup)

**Returns**

`void`

***

### revokeBlobUrl()

> **revokeBlobUrl**: (`mediaId`: `string`) => `void`

Defined in: [src/react/useFiles.ts:144](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#144)

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

Defined in: [src/react/useFiles.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#128)

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

Defined in: [src/react/useFiles.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#88)

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

Defined in: [src/react/useFiles.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#90)

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
