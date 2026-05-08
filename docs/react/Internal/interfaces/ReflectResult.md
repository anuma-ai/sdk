# ReflectResult

Defined in: [src/lib/memory/reflect.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#53)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#59)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#57)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#55)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#61)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
