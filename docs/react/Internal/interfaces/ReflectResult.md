# ReflectResult

Defined in: [src/lib/memory/reflect.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#145)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#151)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#149)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#147)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#153)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
