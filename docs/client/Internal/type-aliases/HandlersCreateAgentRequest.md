# HandlersCreateAgentRequest

> **HandlersCreateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:1502](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1502)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1506](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1506)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:1510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1510)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1514](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1514)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:1518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1518)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1522)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1526)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1532)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1536](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1536)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1540](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1540)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1544](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1544)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1550](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1550)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1554](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1554)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1558](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1558)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1562](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1562)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1566](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1566)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1570)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1574](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1574)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1578](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1578)

Tagline is a short one-liner for marketplace cards.
