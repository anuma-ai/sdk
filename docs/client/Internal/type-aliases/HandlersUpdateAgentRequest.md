# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:2425](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2425)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:2429](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2429)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:2433](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2433)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:2437](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2437)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:2441](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2441)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:2445](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2445)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:2449](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2449)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:2455](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2455)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:2459](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2459)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:2463](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2463)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:2467](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2467)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:2473](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2473)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:2477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2477)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:2481](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2481)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:2485](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2485)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:2489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2489)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2493)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:2497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2497)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:2501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2501)

Tagline is a short one-liner for marketplace cards.
