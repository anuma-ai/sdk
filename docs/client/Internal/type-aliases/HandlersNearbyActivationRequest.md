# HandlersNearbyActivationRequest

> **HandlersNearbyActivationRequest** = `object`

Defined in: [src/client/types.gen.ts:2456](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2456)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2460](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2460)

AccountID is the portal account that activated.

***

### activated\_at?

> `optional` **activated\_at**: `string`

Defined in: [src/client/types.gen.ts:2466](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2466)

ActivatedAt is when the activation happened. Optional — omitted means
"now", since a caller reporting an activation as it happens has nothing
more accurate to send.

***

### area\_slug?

> `optional` **area\_slug**: `string`

Defined in: [src/client/types.gen.ts:2474](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2474)

AreaSlug is the People Nearby area the account activated in. Optional: an
empty slug means the account resolved into no known market, which is a
normal state and is recorded as an activation that earns nothing. The
reward is only payable in an active area, and portal has no way to derive
the area itself.
