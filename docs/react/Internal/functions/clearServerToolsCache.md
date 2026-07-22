# clearServerToolsCache

## Call Signature

> **clearServerToolsCache**(): `void`

Defined in: [src/lib/tools/serverTools.ts:384](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#384)

Clear the cached server tools. Defaults to the browser-`localStorage` backend;
pass the SAME ToolsCacheBackend you gave `getServerTools` to invalidate
a custom backend (a no-op when that backend defines no `clear`). Returns the
backend's clear result, which may be async.

### Returns

`void`

## Call Signature

> **clearServerToolsCache**(`cache`: `ToolsCacheBackend`): `void` | `Promise`<`void`>

Defined in: [src/lib/tools/serverTools.ts:385](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#385)

Clear the cached server tools. Defaults to the browser-`localStorage` backend;
pass the SAME ToolsCacheBackend you gave `getServerTools` to invalidate
a custom backend (a no-op when that backend defines no `clear`). Returns the
backend's clear result, which may be async.

### Parameters

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

`cache`

</td>
<td>

`ToolsCacheBackend`

</td>
</tr>
</tbody>
</table>

### Returns

`void` | `Promise`<`void`>
