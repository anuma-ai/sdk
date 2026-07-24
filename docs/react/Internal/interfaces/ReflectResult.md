# ReflectResult

Defined in: [src/lib/memory/reflect.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#75)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#81)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#79)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#77)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#83)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
