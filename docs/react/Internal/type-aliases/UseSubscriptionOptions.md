# UseSubscriptionOptions

> **UseSubscriptionOptions** = `object`

Defined in: [src/react/useSubscription.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#L22)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useSubscription.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#L34)

Whether to fetch subscription status automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useSubscription.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#L30)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useSubscription.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#L26)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/react/useSubscription.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/react/useSubscription.ts#L38)

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
