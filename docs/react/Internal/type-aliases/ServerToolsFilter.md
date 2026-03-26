# ServerToolsFilter

> **ServerToolsFilter** = `string`\[] | [`ServerToolsFilterFn`](ServerToolsFilterFn.md)

Defined in: [src/lib/db/chat/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#35)

Server tools filter: static list of names or dynamic function.

* string\[]: Static list of tool names to include
* ServerToolsFilterFn: Dynamic filter based on prompt embeddings
