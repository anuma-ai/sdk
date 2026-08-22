# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:3334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3334)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:3338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3338)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:3342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3342)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:3346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3346)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:3350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3350)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:3354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3354)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:3358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3358)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:3364](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3364)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:3368](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3368)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:3372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3372)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:3376](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3376)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3382)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:3386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3386)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:3390](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3390)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:3394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3394)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:3398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3398)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:3402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3402)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:3406](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3406)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:3410](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3410)

Tagline is a short one-liner for marketplace cards.
