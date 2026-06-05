# ParamOptFloat64

> **ParamOptFloat64** = `object`

Defined in: [src/client/types.gen.ts:3792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3792)

An alternative to sampling with temperature, called nucleus sampling, where the
model considers the results of the tokens with top\_p probability mass. So 0.1
means only the tokens comprising the top 10% probability mass are considered.

We generally recommend altering this or `temperature` but not both.

## Properties

### value?

> `optional` **value**: `number`

Defined in: [src/client/types.gen.ts:3793](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3793)
