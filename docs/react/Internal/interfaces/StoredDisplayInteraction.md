# StoredDisplayInteraction

Defined in: [src/lib/db/displayInteraction/types.ts:7](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L7)

A stored display interaction record.

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:13](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L13)

Conversation this interaction belongs to

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/displayInteraction/types.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L23)

Creation timestamp

***

### displayType

> **displayType**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L17)

Display type identifier (e.g. "chart")

***

### id

> **id**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:9](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L9)

WatermelonDB record ID

***

### interactionId

> **interactionId**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:11](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L11)

Stable interaction ID (e.g. "chart\_1234567890\_abc")

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L15)

ID of the message this interaction is anchored after (undefined = unanchored)

***

### result

> **result**: `any`

Defined in: [src/lib/db/displayInteraction/types.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L21)

The resolved result data (typed as any; JSON-serialised in the DB)

***

### toolVersion

> **toolVersion**: `number`

Defined in: [src/lib/db/displayInteraction/types.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L19)

Schema version of the tool that produced this result

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/displayInteraction/types.ts:25](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L25)

Last update timestamp
