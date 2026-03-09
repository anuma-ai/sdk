# UsePhoneCallsOptions

> **UsePhoneCallsOptions** = `object`

Defined in: [src/react/usePhoneCalls.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#25)

## Properties

### autoFetchAvailability?

> `optional` **autoFetchAvailability**: `boolean`

Defined in: [src/react/usePhoneCalls.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#37)

Whether to fetch feature availability automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/usePhoneCalls.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#33)

Optional base URL for the API requests.

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/usePhoneCalls.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#29)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### onError()?

> `optional` **onError**: (`error`: `Error`) => `void`

Defined in: [src/react/usePhoneCalls.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#41)

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
