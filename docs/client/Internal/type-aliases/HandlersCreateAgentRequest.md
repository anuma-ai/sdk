# HandlersCreateAgentRequest

> **HandlersCreateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:1663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1663)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1667](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1667)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:1671](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1671)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1675](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1675)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1679](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1679)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1683](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1683)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1687](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1687)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1693](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1693)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1697)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1701](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1701)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1705)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1711)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1715)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1719](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1719)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1723)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1727](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1727)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1731](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1731)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1735](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1735)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1739](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1739)

Tagline is a short one-liner for marketplace cards.
