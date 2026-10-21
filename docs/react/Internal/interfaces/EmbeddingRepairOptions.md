# EmbeddingRepairOptions

Defined in: [src/lib/memory/store/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#240)

## Properties

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#246)

Where to resume the scan, from a previous result. Defaults to where this store's last run stopped.

***

### maxRows?

> `optional` **maxRows**: `number`

Defined in: [src/lib/memory/store/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#242)

Most memories one run re-embeds. Default 50.

***

### maxScan?

> `optional` **maxScan**: `number`

Defined in: [src/lib/memory/store/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#244)

Most memories one run inspects. Default 2000.
