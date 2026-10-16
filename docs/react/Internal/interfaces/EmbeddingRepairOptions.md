# EmbeddingRepairOptions

Defined in: [src/lib/memory/store/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#216)

## Properties

### cursor?

> `optional` **cursor**: `string`

Defined in: [src/lib/memory/store/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#222)

Where to resume the scan, from a previous result. Defaults to where this store's last run stopped.

***

### maxRows?

> `optional` **maxRows**: `number`

Defined in: [src/lib/memory/store/types.ts:218](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#218)

Most memories one run re-embeds. Default 50.

***

### maxScan?

> `optional` **maxScan**: `number`

Defined in: [src/lib/memory/store/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#220)

Most memories one run inspects. Default 2000.
