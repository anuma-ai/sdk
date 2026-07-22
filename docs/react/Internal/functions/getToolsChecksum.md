# getToolsChecksum

## Call Signature

> **getToolsChecksum**(): `string` | `undefined`

Defined in: [src/lib/tools/serverTools.ts:398](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#398)

Get the checksum of the currently cached tools, or undefined when there is no
cache / no stored checksum. Defaults to the browser-`localStorage` backend;
pass the SAME backend you gave `getServerTools` to read a custom backend's
checksum (an async backend yields a promise).

### Returns

`string` | `undefined`

## Call Signature

> **getToolsChecksum**(`cache`: `ToolsCacheBackend`): `string` | `Promise`<`string` | `undefined`> | `undefined`

Defined in: [src/lib/tools/serverTools.ts:399](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#399)

Get the checksum of the currently cached tools, or undefined when there is no
cache / no stored checksum. Defaults to the browser-`localStorage` backend;
pass the SAME backend you gave `getServerTools` to read a custom backend's
checksum (an async backend yields a promise).

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

`string` | `Promise`<`string` | `undefined`> | `undefined`
