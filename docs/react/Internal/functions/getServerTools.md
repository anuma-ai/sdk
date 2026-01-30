# getServerTools

> **getServerTools**(`options`: [`ServerToolsOptions`](../interfaces/ServerToolsOptions.md)): `Promise`<`ServerTool`\[]>

Defined in: [src/lib/tools/serverTools.ts:276](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/serverTools.ts#L276)

Get server tools with caching support.

Flow:

1. Check localStorage cache
2. If cache valid and not force refresh, return cached tools
3. Otherwise, fetch from API, cache, and return
4. On fetch failure, return cached tools if available (stale-while-error)

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

[`ServerToolsOptions`](../interfaces/ServerToolsOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`ServerTool`\[]>
