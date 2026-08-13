# defaultServerToolsFilter

> `const` **defaultServerToolsFilter**: [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

Defined in: [src/lib/tools/serverTools.ts:1673](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1673)

Pre-configured server-tools filter ready to drop into `useChatStorage`'s
`serverTools` option. Semantic matching against the user prompt with the
default exclusion list applied, plus call-chain expansion via
[SERVER\_TOOL\_DEPENDENCY\_SETS](SERVER_TOOL_DEPENDENCY_SETS.md) so continuation tools (read-after-search,
geocode-before-weather) ride in with their entry tool.

## Example

```ts
import { defaultServerToolsFilter, useChatStorage } from "@anuma/sdk/react";

useChatStorage({
  ...,
  serverTools: defaultServerToolsFilter,
});
```

If you need to customize (extra excludes, different limits, opt into
tool-set expansion), call `createServerToolsFilter` directly.
