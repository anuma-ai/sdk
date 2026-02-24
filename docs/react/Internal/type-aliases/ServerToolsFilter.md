# ServerToolsFilter

> **ServerToolsFilter** = `string`\[] | [`ServerToolsFilterFn`](ServerToolsFilterFn.md)

Defined in: [src/lib/db/chat/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L33)

Server tools filter: static list of names or dynamic function.

* string\[]: Static list of tool names to include
* ServerToolsFilterFn: Dynamic filter based on prompt embeddings
