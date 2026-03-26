# StoredSavedTool

Defined in: [src/lib/db/savedTools/types.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#18)

Plain object representation of a saved tool record.

## Properties

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/db/savedTools/types.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#32)

ID of the conversation where this app was originally created

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/savedTools/types.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#33)

***

### description

> **description**: `string`

Defined in: [src/lib/db/savedTools/types.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#26)

LLM-facing description — determines when the model invokes this tool

***

### displayName

> **displayName**: `string`

Defined in: [src/lib/db/savedTools/types.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#24)

Human-readable display name (e.g. "Stock Price Tracker")

***

### html

> **html**: `string`

Defined in: [src/lib/db/savedTools/types.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#30)

The saved HTML template

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/savedTools/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#35)

***

### name

> **name**: `string`

Defined in: [src/lib/db/savedTools/types.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#22)

Internal name used in the tool function name (e.g. "stocks\_tracker")

***

### parameters

> **parameters**: `Record`<`string`, [`SavedToolParameter`](SavedToolParameter.md)>

Defined in: [src/lib/db/savedTools/types.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#28)

Parameters the LLM can pass when calling this tool

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/savedTools/types.ts:20](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#20)

WatermelonDB internal ID

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/savedTools/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/savedTools/types.ts#34)
