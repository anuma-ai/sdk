# HandlersCreateAgentRequest

> **HandlersCreateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:1583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1583)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1587](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1587)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:1591](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1591)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1595](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1595)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1599)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1603](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1603)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1607](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1607)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1613](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1613)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1617](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1617)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1621](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1621)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1625](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1625)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1631](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1631)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1635](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1635)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1639](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1639)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1643](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1643)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1647](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1647)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1651](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1651)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1655](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1655)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1659](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1659)

Tagline is a short one-liner for marketplace cards.
