# HandlersDmRequestCreatedRequest

> **HandlersDmRequestCreatedRequest** = `object`

Defined in: [src/client/types.gen.ts:2165](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2165)

## Properties

### conversation\_id?

> `optional` **conversation\_id**: `number`

Defined in: [src/client/types.gen.ts:2166](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2166)

***

### recipient\_account\_id?

> `optional` **recipient\_account\_id**: `number`

Defined in: [src/client/types.gen.ts:2171](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2171)

RecipientAccountID is who gets the push — nearby resolves this the same way
MeetupJoinedRequest's HostAccountID is resolved.

***

### sender\_display\_name?

> `optional` **sender\_display\_name**: `string`

Defined in: [src/client/types.gen.ts:2177](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2177)

SenderDisplayName MUST already be moderated by the caller — this handler renders it
straight into push copy that lands on the recipient's lock screen, the same trust
boundary MeetupJoinedRequest's GuestDisplayName documents.
