# PhoneCallPollingOptions

> **PhoneCallPollingOptions** = `object`

Defined in: [src/react/usePhoneCalls.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#44)

## Properties

### intervalMs?

> `optional` **intervalMs**: `number`

Defined in: [src/react/usePhoneCalls.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#48)

Poll interval in milliseconds.

***

### maxAttempts?

> `optional` **maxAttempts**: `number`

Defined in: [src/react/usePhoneCalls.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#52)

Maximum number of polling attempts before stopping.

***

### onUpdate()?

> `optional` **onUpdate**: (`call`: [`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md)) => `void`

Defined in: [src/react/usePhoneCalls.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#60)

Optional callback after each successful poll response.

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

`call`

</td>
<td>

[`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### stopWhenCompleted?

> `optional` **stopWhenCompleted**: `boolean`

Defined in: [src/react/usePhoneCalls.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#56)

Stop automatically when the call reaches a terminal state.
