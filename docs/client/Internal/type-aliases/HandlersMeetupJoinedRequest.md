# HandlersMeetupJoinedRequest

> **HandlersMeetupJoinedRequest** = `object`

Defined in: [src/client/types.gen.ts:2547](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2547)

## Properties

### guest\_display\_name?

> `optional` **guest\_display\_name**: `string`

Defined in: [src/client/types.gen.ts:2553](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2553)

GuestDisplayName MUST already be moderated by the caller — this handler renders it
straight into push copy that lands on the host's lock screen, the same trust boundary
ai-memoryless-client#1499 documents for message-request push copy.

***

### host\_account\_id?

> `optional` **host\_account\_id**: `number`

Defined in: [src/client/types.gen.ts:2559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2559)

HostAccountID is who gets the push — nearby resolves this via
GET /internal/accounts/by-did/{did} before calling here, same as
NotifyNearbyActivation's caller-resolves-the-account-id shape.

***

### meetup\_id?

> `optional` **meetup\_id**: `string`

Defined in: [src/client/types.gen.ts:2560](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2560)

***

### meetup\_title?

> `optional` **meetup\_title**: `string`

Defined in: [src/client/types.gen.ts:2561](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2561)
