# HandlersAgentListItem

> **HandlersAgentListItem** = `object`

Defined in: [src/client/types.gen.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#59)

## Properties

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#63)

Category groups agents by use case.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#67)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#71)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#75)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#79)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#83)

ID is the unique identifier.

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#87)

Name is the human-readable name.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#91)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#95)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#99)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#103)

UpdatedAt is when the agent was last updated.
