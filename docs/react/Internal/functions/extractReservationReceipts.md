# extractReservationReceipts

> **extractReservationReceipts**(`toolCallEvents?`: [`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]): [`ReservationReceipt`](../type-aliases/ReservationReceipt.md)\[]

Defined in: [src/lib/chat/reservationReceipts.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#55)

One receipt per kind for the turn's booking and cancel calls, holding the
last attempt's outcome. A `made` outcome is never replaced by a later one,
so a refused call followed by a successful retry reads as made.

## Parameters

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

`toolCallEvents?`

</td>
<td>

[`LlmapiToolCallEvent`](../../../client/Internal/type-aliases/LlmapiToolCallEvent.md)\[]

</td>
</tr>
</tbody>
</table>

## Returns

[`ReservationReceipt`](../type-aliases/ReservationReceipt.md)\[]
