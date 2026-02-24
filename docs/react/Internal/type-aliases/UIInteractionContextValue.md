# UIInteractionContextValue

> **UIInteractionContextValue** = `object`

Defined in: [src/react/useUIInteraction.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L36)

Context value for UI interactions

## Properties

### cancelInteraction()

> **cancelInteraction**: (`id`: `string`) => `void`

Defined in: [src/react/useUIInteraction.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L47)

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

Defined in: [src/react/useUIInteraction.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L48)

**Returns**

`void`

***

### createDisplayInteraction()

> **createDisplayInteraction**: (`id`: `string`, `displayType`: `string`, `data`: `any`, `result`: `any`, `toolVersion?`: `number`) => `void`

Defined in: [src/react/useUIInteraction.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L39)

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

Defined in: [src/react/useUIInteraction.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L38)

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

Defined in: [src/react/useUIInteraction.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L49)

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

Defined in: [src/react/useUIInteraction.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L37)

***

### resolveInteraction()

> **resolveInteraction**: (`id`: `string`, `result`: `any`) => `void`

Defined in: [src/react/useUIInteraction.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#L46)

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
