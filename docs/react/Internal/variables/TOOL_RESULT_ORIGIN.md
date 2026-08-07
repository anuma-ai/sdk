# TOOL\_RESULT\_ORIGIN

> `const` **TOOL\_RESULT\_ORIGIN**: `"tool_result"`

Defined in: [src/lib/chat/toolResults.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/toolResults.ts#60)

Value of the `origin` column on a row the SDK synthesised for a turn's tool results (v44, #866).

`satisfies MessageOrigin` so this constant and the column's union cannot drift apart silently.
