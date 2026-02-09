# UseCreditsOptions

> **UseCreditsOptions** = `object`

Defined in: [src/react/useCredits.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useCredits.ts#L20)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useCredits.ts:32](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useCredits.ts#L32)

Whether to fetch credit balance automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useCredits.ts:28](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useCredits.ts#L28)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useCredits.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useCredits.ts#L24)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/react/useCredits.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useCredits.ts#L36)

Optional callback for error handling

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
