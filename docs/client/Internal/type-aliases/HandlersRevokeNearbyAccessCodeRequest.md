# HandlersRevokeNearbyAccessCodeRequest

> **HandlersRevokeNearbyAccessCodeRequest** = `object`

Defined in: [src/client/types.gen.ts:3176](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3176)

## Properties

### code?

> `optional` **code**: `string`

Defined in: [src/client/types.gen.ts:3177](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3177)

***

### revoked?

> `optional` **revoked**: `boolean`

Defined in: [src/client/types.gen.ts:3183](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3183)

Revoked is a POINTER for the same reason SetInternalTesterRequest.Grant is: this is a
security mutation, and an omitted field must be an error rather than a default that quietly
un-revokes a code someone deliberately killed.
