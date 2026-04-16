# FileTypeQuery

Defined in: [src/lib/processors/registry.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#8)

Minimal file shape needed to look up or test for a processor.
Wider than `FileMetadata` so callers with `File`, `Blob`-like objects, or
just a `{ name, type }` pair from a drag-drop event can use the API.

## Properties

### name

> **name**: `string`

Defined in: [src/lib/processors/registry.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#9)

***

### type

> **type**: `string`

Defined in: [src/lib/processors/registry.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/processors/registry.ts#10)
