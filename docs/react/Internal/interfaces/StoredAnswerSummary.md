# StoredAnswerSummary

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#173)

Stored form of the portal's answer summary, with `durationMs` summed across tool-loop rounds.

## Properties

### durationMs

> **durationMs**: `number`

Defined in: [src/lib/db/chat/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#174)

***

### sourceCount

> **sourceCount**: `number`

Defined in: [src/lib/db/chat/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#176)

Number of distinct server tools that returned ok, not cited pages; show `StoredMessage.sources` for a citation count.

***

### sources

> **sources**: [`AnswerSource`](../type-aliases/AnswerSource.md)\[]

Defined in: [src/lib/db/chat/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#177)
