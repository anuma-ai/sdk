# UIInteractionContextValue

> **UIInteractionContextValue** = `object`

Defined in: [src/react/useUIInteraction.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L36)

Context value for UI interactions

## Properties

### cancelInteraction()

> **cancelInteraction**: (`id`: `string`) => `void`

Defined in: [src/react/useUIInteraction.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L51)

**Parameters**

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### clearInteractions()

> **clearInteractions**: () => `void`

Defined in: [src/react/useUIInteraction.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L52)

**Returns**

`void`

***

### createDisplayInteraction()

> **createDisplayInteraction**: (`id`: `string`, `displayType`: `string`, `data`: `any`, `result`: `any`, `toolVersion?`: `number`) => `void`

Defined in: [src/react/useUIInteraction.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L43)

**Parameters**

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`displayType`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`data`

</td>
<td>

`any`

</td>
</tr>
<tr>
<td>

`result`

</td>
<td>

`any`

</td>
</tr>
<tr>
<td>

`toolVersion?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### createInteraction()

> **createInteraction**: (`id`: `string`, `type`: [`InteractionType`](InteractionType.md), `data`: `any`) => `Promise`<`any`>

Defined in: [src/react/useUIInteraction.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L38)

**Parameters**

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`type`

</td>
<td>

[`InteractionType`](InteractionType.md)

</td>
</tr>
<tr>
<td>

`data`

</td>
<td>

`any`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`any`>

***

### getInteraction()

> **getInteraction**: (`id`: `string`) => [`PendingInteraction`](PendingInteraction.md) | `undefined`

Defined in: [src/react/useUIInteraction.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L53)

**Parameters**

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

`id`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

[`PendingInteraction`](PendingInteraction.md) | `undefined`

***

### pendingInteractions

> **pendingInteractions**: `Map`<`string`, [`PendingInteraction`](PendingInteraction.md)>

Defined in: [src/react/useUIInteraction.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L37)

***

### resolveInteraction()

> **resolveInteraction**: (`id`: `string`, `result`: `any`) => `void`

Defined in: [src/react/useUIInteraction.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useUIInteraction.ts#L50)

**Parameters**

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

`id`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`result`

</td>
<td>

`any`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
