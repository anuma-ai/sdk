# selectServerToolsForPrompt

> **selectServerToolsForPrompt**(`options`: [`SelectServerToolsForPromptOptions`](../interfaces/SelectServerToolsForPromptOptions.md)): `Promise`<[`ServerTool`](../interfaces/ServerTool.md)\[]>

Defined in: [src/lib/tools/serverTools.ts:1379](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1379)

Select server-side tools for a prompt using the same path
`useChatStorage` runs internally. Use this anywhere outside the chat
hook — background-task workers, server scripts, debug tools — that needs
the same selection the chat flow would produce.

Mirrors the responses-API branch of `sendMessage`: fetch catalog with
caching, optionally embed the prompt (only when the filter is a function),
apply the filter, return matching `ServerTool[]` (with embeddings and
descriptions intact for downstream serialization).

Returns `[]` on any of: undefined/empty filter, empty prompt for a
function filter, failed catalog fetch, or failed embedding.

## Parameters

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

[`SelectServerToolsForPromptOptions`](../interfaces/SelectServerToolsForPromptOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`ServerTool`](../interfaces/ServerTool.md)\[]>

## Example

```ts
import { defaultServerToolsFilter, selectServerToolsForPrompt } from "@anuma/sdk/server";

const tools = await selectServerToolsForPrompt({
  prompt: "Generate a slide deck about AI",
  serverToolsFilter: defaultServerToolsFilter,
  getToken: async () => identityToken,
  baseUrl: process.env.API_URL,
});
```
