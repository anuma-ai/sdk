# ReservationReceipt

> **ReservationReceipt** = `object`

Defined in: [src/lib/chat/reservationReceipts.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#7)

What became of a restaurant booking or cancellation in one turn, read from
the server's own tool result rather than from the model's reply.

## Properties

### day

> **day**: `string`

Defined in: [src/lib/chat/reservationReceipts.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#17)

As the call sent it, e.g. `2026-10-23`.

***

### feeSummary?

> `optional` **feeSummary**: `string`

Defined in: [src/lib/chat/reservationReceipts.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#25)

The restaurant's own cancellation terms, when the booking result carries them.

***

### kind

> **kind**: `"booking"` | `"cancel"`

Defined in: [src/lib/chat/reservationReceipts.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#8)

***

### partySize?

> `optional` **partySize**: `number`

Defined in: [src/lib/chat/reservationReceipts.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#20)

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/lib/chat/reservationReceipts.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#27)

The provider's stated reason, when it did not happen.

***

### reservationId?

> `optional` **reservationId**: `string`

Defined in: [src/lib/chat/reservationReceipts.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#21)

***

### resyUrl?

> `optional` **resyUrl**: `string`

Defined in: [src/lib/chat/reservationReceipts.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#23)

Resy page where the user can see the reservation.

***

### status

> **status**: `"made"` | `"not_made"` | `"already_done"` | `"unknown"`

Defined in: [src/lib/chat/reservationReceipts.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#14)

`made`: the provider confirmed it. `not_made`: it did not happen.
`already_done`: an earlier call in the conversation had already done it.
`unknown`: the call reached the provider and its outcome is not known.

***

### time

> **time**: `string`

Defined in: [src/lib/chat/reservationReceipts.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#19)

As the call sent it, e.g. `9:00 PM`.

***

### venueName

> **venueName**: `string`

Defined in: [src/lib/chat/reservationReceipts.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/reservationReceipts.ts#15)
