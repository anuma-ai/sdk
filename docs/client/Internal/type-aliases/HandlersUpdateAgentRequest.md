# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:1038](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1038)

## Properties

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:1042](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1042)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1046](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1046)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1050](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1050)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1054](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1054)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1058](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1058)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1064](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1064)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1068](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1068)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1072](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1072)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1076](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1076)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1082](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1082)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1086)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1090)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1094)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1098)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1102](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1102)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1106)

Tagline is a short one-liner for marketplace cards.
