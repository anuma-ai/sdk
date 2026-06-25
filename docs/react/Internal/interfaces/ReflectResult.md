# ReflectResult

Defined in: [src/lib/memory/reflect.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#69)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#75)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#73)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#71)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#77)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
