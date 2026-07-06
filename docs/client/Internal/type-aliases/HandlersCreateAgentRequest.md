# HandlersCreateAgentRequest

> **HandlersCreateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:1638](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1638)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1642](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1642)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:1646](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1646)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1650](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1650)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1654](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1654)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1658)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1662)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1668](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1668)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1672](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1672)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1676](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1676)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1680](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1680)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1686](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1686)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1690](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1690)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1694](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1694)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1698](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1698)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1702](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1702)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1706](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1706)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1710](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1710)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1714](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1714)

Tagline is a short one-liner for marketplace cards.
