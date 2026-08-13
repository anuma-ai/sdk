# ServerToolsFilterFunction

> **ServerToolsFilterFunction** = (`embeddings`: `number`\[] | `number`\[]\[], `tools`: [`ServerTool`](../interfaces/ServerTool.md)\[]) => `string`\[] & `object`

Defined in: [src/lib/tools/serverTools.ts:1716](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1716)

Type for a server-tools filter — a function that takes prompt embeddings
and the full server tool catalog and returns the names of tools to keep.
Matches `useChatStorage`'s `serverTools` callback signature.

## Type Declaration

### excludeTools?

> `readonly` `optional` **excludeTools**: readonly `string`\[]

The unconditional exclusions this filter applies, exposed by
[createServerToolsFilter](../functions/createServerToolsFilter.md) so defer-loading can honour them without the caller
repeating the list — see resolveDeferredServerTools. Absent on a hand-written
filter, or on one wrapped in a plain closure.
