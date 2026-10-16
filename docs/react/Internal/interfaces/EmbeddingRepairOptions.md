# EmbeddingRepairOptions

Defined in: [src/lib/memory/store/types.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#233)

## Properties

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#239)

Where to resume the scan, from a previous result. Defaults to where this store's last run stopped.

***

### maxRows?

> `optional` **maxRows**: `number`

Defined in: [src/lib/memory/store/types.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#235)

Most memories one run re-embeds. Default 50.

***

### maxScan?

> `optional` **maxScan**: `number`

Defined in: [src/lib/memory/store/types.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#237)

Most memories one run inspects. Default 2000.
