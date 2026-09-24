# FileProcessingStatus

Defined in: [src/lib/processors/types.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#139)

What happened to one attached file during preprocessing — so the app can tell the user
precisely which attachment the model could not read, and why.

* `extracted`: its full text reached the model
* `truncated`: part of it reached the model (a size/row/image budget cut the rest)
* `rendered_as_images`: some or all pages were sent as images (scanned PDF)
* `skipped`: not processed (see `reason`)
* `failed`: processing was attempted and failed (see `reason`)

## Properties

### fileId

> **fileId**: `string`

Defined in: [src/lib/processors/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#140)

***

### fileName

> **fileName**: `string`

Defined in: [src/lib/processors/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#141)

***

### reason?

> `optional` **reason**: [`FileProcessingReason`](../type-aliases/FileProcessingReason.md)

Defined in: [src/lib/processors/types.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#143)

***

### status

> **status**: `"truncated"` | `"extracted"` | `"rendered_as_images"` | `"skipped"` | `"failed"`

Defined in: [src/lib/processors/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/types.ts#142)
