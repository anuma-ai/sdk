# ReflectResult

Defined in: [src/lib/memory/reflect.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#59)

## Properties

### basedOn

> **basedOn**: `object`

Defined in: [src/lib/memory/reflect.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#65)

Citations: memory ids the answer was grounded on.

**memoryIds**

> **memoryIds**: `string`\[]

***

### structuredOutput?

> `optional` **structuredOutput**: `unknown`

Defined in: [src/lib/memory/reflect.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#63)

Parsed structured output when `responseSchema` is provided.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/reflect.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#61)

The synthesized answer text.

***

### usage

> **usage**: `object`

Defined in: [src/lib/memory/reflect.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#67)

Token accounting from the LLM call.

**completionTokens**

> **completionTokens**: `number`

**promptTokens**

> **promptTokens**: `number`

**totalTokens**

> **totalTokens**: `number`
