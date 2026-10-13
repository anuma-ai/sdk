# getServerTools

> **getServerTools**(`options`: [`ServerToolsOptions`](../interfaces/ServerToolsOptions.md)): `Promise`<[`ServerTool`](../interfaces/ServerTool.md)\[]>

Defined in: [src/lib/tools/serverTools.ts:437](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#437)

Get server tools with caching support.

Flow:

1. Check the cache backend (localStorage by default; override via `cache`)
2. If cache valid and not force refresh, return cached tools
3. Otherwise, fetch from API, cache, and return. When the cache holds an ETag,
   the request sends If-None-Match. On 304 the cached tools stay and only the
   stored timestamp changes.
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

`Promise`<[`ServerTool`](../interfaces/ServerTool.md)\[]>
