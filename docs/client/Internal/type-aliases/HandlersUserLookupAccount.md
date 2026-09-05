# HandlersUserLookupAccount

> **HandlersUserLookupAccount** = `object`

Defined in: [src/client/types.gen.ts:3799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3799)

Account is nil when the identifier resolves to a Privy user that has no
portal account row yet (e.g. a Privy signup that never completed onboarding).

## Properties

### created\_at?

> `optional` **created\_at**: `string`

Defined in: [src/client/types.gen.ts:3800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3800)

***

### fraud\_flag?

> `optional` **fraud\_flag**: `string`

Defined in: [src/client/types.gen.ts:3801](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3801)

***

### fraud\_flag\_updated\_at?

> `optional` **fraud\_flag\_updated\_at**: `string`

Defined in: [src/client/types.gen.ts:3802](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3802)

***

### fraud\_notes?

> `optional` **fraud\_notes**: `string`

Defined in: [src/client/types.gen.ts:3803](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3803)

***

### id?

> `optional` **id**: `number`

Defined in: [src/client/types.gen.ts:3804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3804)

***

### identifier?

> `optional` **identifier**: `string`

Defined in: [src/client/types.gen.ts:3805](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3805)

***

### internal\_tester?

> `optional` **internal\_tester**: `boolean`

Defined in: [src/client/types.gen.ts:3812](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3812)

InternalTester and InternalTesterAt report the People Nearby internal-tester grant (#1578), so
the console renders the toggle's CURRENT state instead of guessing. Always emitted (no omitempty)
because false is meaningful here — an absent field would be indistinguishable from an older
portal build, on a security-relevant flag.

***

### internal\_tester\_at?

> `optional` **internal\_tester\_at**: `string`

Defined in: [src/client/types.gen.ts:3813](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3813)

***

### stripe\_customer\_id?

> `optional` **stripe\_customer\_id**: `string`

Defined in: [src/client/types.gen.ts:3814](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3814)

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:3815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3815)
