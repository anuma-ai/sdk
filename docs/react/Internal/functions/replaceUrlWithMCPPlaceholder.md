# replaceUrlWithMCPPlaceholder

> **replaceUrlWithMCPPlaceholder**(`content`: `string`, `url`: `string`, `fileId`: `string`): `string`

Defined in: src/react/useChatStorage.ts:70

Replace a URL in content with an MCP\_IMAGE placeholder.
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

The content with the URL replaced by !\[MCP\_IMAGE:fileId]

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
