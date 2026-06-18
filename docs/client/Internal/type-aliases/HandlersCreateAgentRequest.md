# HandlersCreateAgentRequest

> **HandlersCreateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:1606](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1606)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1610](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1610)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:1614](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1614)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1618)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1622](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1622)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1626)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1630)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1636](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1636)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1640](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1640)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1644](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1644)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1648)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1654](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1654)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1658)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1662)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1666](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1666)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1670](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1670)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1674)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1678](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1678)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1682](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1682)

Tagline is a short one-liner for marketplace cards.
