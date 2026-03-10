# UsePhoneCallsResult

> **UsePhoneCallsResult** = `object`

Defined in: [src/react/usePhoneCalls.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#63)

## Properties

### createPhoneCall()

> **createPhoneCall**: (`request`: [`HandlersCreatePhoneCallRequest`](../../../client/Internal/type-aliases/HandlersCreatePhoneCallRequest.md)) => `Promise`<[`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md) | `null`>

Defined in: [src/react/usePhoneCalls.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#91)

Create a phone call.

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

`request`

</td>
<td>

[`HandlersCreatePhoneCallRequest`](../../../client/Internal/type-aliases/HandlersCreatePhoneCallRequest.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md) | `null`>

***

### currentCall

> **currentCall**: [`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md) | `null`

Defined in: [src/react/usePhoneCalls.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#71)

The latest phone call loaded by this hook.

***

### error

> **error**: `Error` | `null`

Defined in: [src/react/usePhoneCalls.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#83)

Error from the last operation.

***

### fetchAvailability()

> **fetchAvailability**: () => `Promise`<`boolean` | `null`>

Defined in: [src/react/usePhoneCalls.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#87)

Fetch whether phone calling is enabled.

**Returns**

`Promise`<`boolean` | `null`>

***

### getPhoneCall()

> **getPhoneCall**: (`callId`: `string`) => `Promise`<[`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md) | `null`>

Defined in: [src/react/usePhoneCalls.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#97)

Fetch a phone call by call ID.

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

`callId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md) | `null`>

***

### isEnabled

> **isEnabled**: `boolean` | `null`

Defined in: [src/react/usePhoneCalls.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#67)

Whether phone calling is enabled on the connected portal.

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/react/usePhoneCalls.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#75)

Whether a non-polling request is in flight.

***

### isPolling

> **isPolling**: `boolean`

Defined in: [src/react/usePhoneCalls.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#79)

Whether a polling loop is currently active.

***

### pollPhoneCall()

> **pollPhoneCall**: (`callId`: `string`, `options?`: [`PhoneCallPollingOptions`](PhoneCallPollingOptions.md)) => `Promise`<[`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md) | `null`>

Defined in: [src/react/usePhoneCalls.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#101)

Poll a phone call until completion or the polling limit is reached.

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

`callId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`PhoneCallPollingOptions`](PhoneCallPollingOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`HandlersPhoneCallResponse`](../../../client/Internal/type-aliases/HandlersPhoneCallResponse.md) | `null`>

***

### reset()

> **reset**: () => `void`

Defined in: [src/react/usePhoneCalls.ts:112](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#112)

Clear the current call and last error.

**Returns**

`void`

***

### stopPolling()

> **stopPolling**: () => `void`

Defined in: [src/react/usePhoneCalls.ts:108](https://github.com/anuma-ai/sdk/blob/main/src/react/usePhoneCalls.ts#108)

Stop any active polling loop.

**Returns**

`void`
