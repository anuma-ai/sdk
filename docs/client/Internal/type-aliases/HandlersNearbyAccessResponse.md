# HandlersNearbyAccessResponse

> **HandlersNearbyAccessResponse** = `object`

Defined in: [src/client/types.gen.ts:2616](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2616)

## Properties

### granted?

> `optional` **granted**: `boolean`

Defined in: [src/client/types.gen.ts:2620](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2620)

Granted is the only field a client needs to decide whether to show the code screen.

***

### newly\_admitted?

> `optional` **newly\_admitted**: `boolean`

Defined in: [src/client/types.gen.ts:2626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2626)

NewlyAdmitted distinguishes "this call let you in" from "you were already in" on the redeem
path. Both are 200s. It exists for analytics and for copy — a second device redeeming the
same code should not celebrate as if it were the first — and is always false on the read.
