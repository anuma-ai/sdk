# UseToolsResult

> **UseToolsResult** = `object`

Defined in: [src/react/useTools.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useTools.ts#L39)

## Properties

### checkForUpdates()

> **checkForUpdates**: (`responseChecksum`: `string` | `undefined`) => `boolean`

Defined in: [src/react/useTools.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useTools.ts#L59)

Check if tools need to be refreshed based on a response checksum.
If the checksum differs from cached, automatically triggers a refresh.

**Parameters**

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

`responseChecksum`

</td>
<td>

`string` | `undefined`

</td>
<td>

Checksum from a chat response

</td>
</tr>
</tbody>
</table>

**Returns**

`boolean`

true if refresh was triggered

***

### checksum

> **checksum**: `string` | `undefined`

Defined in: [src/react/useTools.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useTools.ts#L43)

Current tools checksum from cache

***

### error

> **error**: `Error` | `null`

Defined in: [src/react/useTools.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useTools.ts#L47)

Error from the last fetch attempt

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/react/useTools.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useTools.ts#L45)

Whether tools are being fetched

***

### refresh()

> **refresh**: (`force?`: `boolean`) => `Promise`<`void`>

Defined in: [src/react/useTools.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useTools.ts#L52)

Refresh tools from the server.

**Parameters**

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

`force?`

</td>
<td>

`boolean`

</td>
<td>

Force refresh even if cache is valid

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

***

### tools

> **tools**: [`ServerTool`](../interfaces/ServerTool.md)\[]

Defined in: [src/react/useTools.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useTools.ts#L41)

Available server tools
