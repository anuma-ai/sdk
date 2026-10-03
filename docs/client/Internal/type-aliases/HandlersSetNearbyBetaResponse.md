# HandlersSetNearbyBetaResponse

> **HandlersSetNearbyBetaResponse** = `object`

Defined in: [src/client/types.gen.ts:3328](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3328)

## Properties

### message?

> `optional` **message**: `string`

Defined in: [src/client/types.gen.ts:3329](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3329)

***

### nearby\_beta?

> `optional` **nearby\_beta**: `boolean`

Defined in: [src/client/types.gen.ts:3330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3330)

***

### success?

> `optional` **success**: `boolean`

Defined in: [src/client/types.gen.ts:3331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3331)

***

### user\_address?

> `optional` **user\_address**: `string`

Defined in: [src/client/types.gen.ts:3332](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3332)

***

### was\_admitted?

> `optional` **was\_admitted**: `boolean`

Defined in: [src/client/types.gen.ts:3338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3338)

WasAdmitted is whether the account held admission BEFORE this call, so a console can tell a
revoke that removed someone from one that pre-emptively blocked an account which was never in.
Both are durable; only one of them is what an operator usually means by "revoke".
