# extractMCPImageUrls

> **extractMCPImageUrls**(`content`: `string`, `toolCallEvents`: `ToolCallEvent`\[] | `undefined`, `mcpR2Domain`: `string`): `ExtractedMediaUrl`\[]

Defined in: [src/lib/storage/mcpImages.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/mcpImages.ts#96)

Extracts MCP media URLs from tool\_call\_events (primary) or content (fallback).

Primary path: parses JSON output of image- and video-generation tool calls.
Fallback path: regex-matches MCP R2 domain URLs in content and classifies
each by file extension (so videos aren't mislabeled as images).

The function name is retained for call-site stability; it now returns videos
too, each tagged with `mediaType`.

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

The message content (may contain markdown/HTML media refs)

</td>
</tr>
<tr>
<td>

`toolCallEvents`

</td>
<td>

`ToolCallEvent`\[] | `undefined`

</td>
<td>

Tool call events from streaming accumulator

</td>
</tr>
<tr>
<td>

`mcpR2Domain`

</td>
<td>

`string`

</td>
<td>

The R2 domain to match

</td>
</tr>
</tbody>
</table>

## Returns

`ExtractedMediaUrl`\[]

Array of extracted URLs with model + mediaType info
