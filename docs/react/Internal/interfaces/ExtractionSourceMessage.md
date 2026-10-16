# ExtractionSourceMessage

Defined in: [src/lib/memory/durableExtraction.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#18)

A message a [ExtractionMessageSource](ExtractionMessageSource.md) resolves from a queued id.

## Properties

### content

> **content**: `string`

Defined in: [src/lib/memory/durableExtraction.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#21)

***

### id

> **id**: `string`

Defined in: [src/lib/memory/durableExtraction.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#19)

***

### role

> **role**: `"user"` | `"assistant"`

Defined in: [src/lib/memory/durableExtraction.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#20)

***

### seq

> **seq**: `number`

Defined in: [src/lib/memory/durableExtraction.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#23)

Position in the conversation; must increase with send order.
