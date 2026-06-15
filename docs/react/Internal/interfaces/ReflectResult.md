# ReflectResult

Defined in: [src/lib/memory/reflect.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#64)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#70)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#68)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#66)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#72)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
