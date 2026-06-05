# LlmapiChatCompletionUsage

> **LlmapiChatCompletionUsage** = [`OpenaiCompletionUsage`](OpenaiCompletionUsage.md) & `object`

Defined in: [src/clientCompat.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/clientCompat.ts#49)

The pre-migration usage shape: standard OpenAI token counts plus the
portal's cost/credit fields all on one flat object. The new schema splits
these — OpenAI tokens stay in `usage`, portal cost fields move to the
`portal` envelope — so this type no longer appears in the generated client.

Kept as a named alias because it is a public export: removing it on a
non-major bump would break consumers (CLI, client, externals) that pin the
type by name. The SDK's `buildFinalResponse` mirrors cost fields back into
`usage`, so a streaming response's `usage` still matches this shape.

## Type Declaration

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

### credits\_used?

> `optional` **credits\_used**: `number`

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

### pricing\_source?

> `optional` **pricing\_source**: `string`

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`
