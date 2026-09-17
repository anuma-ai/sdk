# ReflectResult

Defined in: [src/lib/memory/reflect.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#174)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#180)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#178)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#176)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#182)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
