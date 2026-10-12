# ReflectResult

Defined in: [src/lib/memory/reflect.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#115)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#121)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#119)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#117)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#123)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
