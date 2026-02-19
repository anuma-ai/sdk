# CreateDisplayInteractionOptions

Defined in: [src/lib/db/displayInteraction/types.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L31)

Options for creating a new display interaction record.

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L35)

Conversation this interaction belongs to

***

### displayType

> **displayType**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L39)

Display type identifier (e.g. "chart")

***

### interactionId?

> `optional` **interactionId**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L33)

Pre-generated interaction ID. If omitted, one will be generated.

***

### messageId?

> `optional` **messageId**: `string`

Defined in: [src/lib/db/displayInteraction/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L37)

ID of the message this interaction is anchored after

***

### result

> **result**: `any`

Defined in: [src/lib/db/displayInteraction/types.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L43)

The resolved result data

***

### toolVersion

> **toolVersion**: `number`

Defined in: [src/lib/db/displayInteraction/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/displayInteraction/types.ts#L41)

Schema version of the tool result
