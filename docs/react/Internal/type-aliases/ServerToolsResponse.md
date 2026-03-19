# ServerToolsResponse

> **ServerToolsResponse** = { `checksum`: `string`; `tools`: `ServerToolsMap`; } | `ServerToolsMap`

Defined in: [src/lib/tools/serverTools.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#53)

Response format from /api/v1/tools endpoint.
New format includes checksum and tools wrapper.
Legacy format is just the tools map directly.
