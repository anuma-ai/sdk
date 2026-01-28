# replaceUrlWithMCPPlaceholder

> **replaceUrlWithMCPPlaceholder**(`content`: `string`, `url`: `string`, `fileId`: `string`): `string`

Defined in: [src/react/useChatStorage.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L88)

Replace a URL in content with an internal file placeholder.
This is used to swap external URLs with locally-stored file references.

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

`content`

</td>
<td>

`string`

</td>
<td>

The message content containing the URL

</td>
</tr>
<tr>
<td>

`url`

</td>
<td>

`string`

</td>
<td>

The URL to replace

</td>
</tr>
<tr>
<td>

`fileId`

</td>
<td>

`string`

</td>
<td>

The OPFS file ID to reference

</td>
</tr>
</tbody>
</table>

## Returns

`string`

The content with the URL replaced by **SDKFILE\_\_fileId**

## Example

```ts
// Replace a URL that returned 404 with local file reference
const newContent = replaceUrlWithMCPPlaceholder(
  message.content,
  "https://example.com/image.png",
  "abc-123-def"
);
await updateMessage(message.uniqueId, { content: newContent });
```
