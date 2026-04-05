# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:1068](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1068)

## Properties

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:1072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1072)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1076)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1080)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1084](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1084)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1088](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1088)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1094)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1098)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1102](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1102)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1106)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1112)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1116)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1120)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1124)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1128)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1132)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1136)

Tagline is a short one-liner for marketplace cards.
