# PendingInteraction\<TData, TResult>

> **PendingInteraction**<`TData`, `TResult`> = `object`

Defined in: [src/react/useUIInteraction.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#20)

Represents a pending user interaction that needs to be resolved

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`TData`

</td>
<td>

`any`

</td>
</tr>
<tr>
<td>

`TResult`

</td>
<td>

`any`

</td>
</tr>
</tbody>
</table>

## Properties

### createdAt

> **createdAt**: `number`

Defined in: [src/react/useUIInteraction.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#26)

***

### data

> **data**: `TData`

Defined in: [src/react/useUIInteraction.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#23)

***

### id

> **id**: `string`

Defined in: [src/react/useUIInteraction.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#21)

***

### reject()

> **reject**: (`error`: `Error`) => `void`

Defined in: [src/react/useUIInteraction.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#25)

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

`error`

</td>
<td>

`Error`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### resolve()

> **resolve**: (`result`: `TResult`) => `void`

Defined in: [src/react/useUIInteraction.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#24)

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

`result`

</td>
<td>

`TResult`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### resolved?

> `optional` **resolved**: `boolean`

Defined in: [src/react/useUIInteraction.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#27)

***

### result?

> `optional` **result**: `TResult`

Defined in: [src/react/useUIInteraction.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#28)

***

### toolVersion?

> `optional` **toolVersion**: `number`

Defined in: [src/react/useUIInteraction.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#30)

Version of the display tool that produced this interaction (for migration on restore)

***

### type

> **type**: [`InteractionType`](InteractionType.md)

Defined in: [src/react/useUIInteraction.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/react/useUIInteraction.ts#22)
