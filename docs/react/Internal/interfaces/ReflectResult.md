# ReflectResult

Defined in: [src/lib/memory/reflect.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#197)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#203)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#201)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#199)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#205)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
