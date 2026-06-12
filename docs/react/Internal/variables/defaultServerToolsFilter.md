# defaultServerToolsFilter

> `const` **defaultServerToolsFilter**: (`embeddings`: `number`\[] | `number`\[]\[], `tools`: [`ServerTool`](../interfaces/ServerTool.md)\[]) => `string`\[]

Defined in: [src/lib/tools/serverTools.ts:1361](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1361)

Pre-configured server-tools filter ready to drop into `useChatStorage`'s
`serverTools` option. Semantic matching against the user prompt with the
default exclusion list applied, plus call-chain expansion via
[SERVER\_TOOL\_DEPENDENCY\_SETS](SERVER_TOOL_DEPENDENCY_SETS.md) so continuation tools (read-after-search,
Fal queue lifecycle) ride in with their entry tool.

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

`embeddings`

</td>
<td>

`number`\[] | `number`\[]\[]

</td>
</tr>
<tr>
<td>

`tools`

</td>
<td>

[`ServerTool`](../interfaces/ServerTool.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

`string`\[]

## Example

```ts
import { defaultServerToolsFilter, useChatStorage } from "@anuma/sdk/react";

useChatStorage({
  ...,
  serverTools: defaultServerToolsFilter,
});
```

If you need to customize (extra excludes, different limits, opt into
tool-set expansion), call `createServerToolsFilter` directly.
