# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:113](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#113)

## Properties

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#117)

Category groups agents by use case.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:121](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#121)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#125)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#129)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#133)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#137)

ID is the unique identifier.

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#141)

Name is the human-readable name.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#145)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#149)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#153)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#157)

SystemPrompt is the curated system prompt.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#161)

UpdatedAt is when the agent was last updated.
