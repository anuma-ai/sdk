# UseCreditsOptions

> **UseCreditsOptions** = `object`

Defined in: [src/react/useCredits.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#21)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useCredits.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#33)

Whether to fetch credit balance automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useCredits.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#29)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useCredits.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#25)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/react/useCredits.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/react/useCredits.ts#37)

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
