# DatabaseManagerLogger

Defined in: [src/lib/db/manager.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L36)

Optional logger interface for DatabaseManager.

## Properties

### debug()?

> `optional` **debug**: (`msg`: `string`, `ctx?`: `Record`<`string`, `unknown`>) => `void`

Defined in: [src/lib/db/manager.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L37)

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

`msg`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`ctx?`

</td>
<td>

`Record`<`string`, `unknown`>

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### info()?

> `optional` **info**: (`msg`: `string`, `ctx?`: `Record`<`string`, `unknown`>) => `void`

Defined in: [src/lib/db/manager.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L39)

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

`msg`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`ctx?`

</td>
<td>

`Record`<`string`, `unknown`>

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### warn()?

> `optional` **warn**: (`msg`: `string`, `ctx?`: `Record`<`string`, `unknown`>) => `void`

Defined in: [src/lib/db/manager.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L38)

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

`msg`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`ctx?`

</td>
<td>

`Record`<`string`, `unknown`>

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
