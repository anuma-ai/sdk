# ReflectResult

Defined in: [src/lib/memory/reflect.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#98)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:104](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#104)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:102](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#102)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:100](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#100)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:106](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#106)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
