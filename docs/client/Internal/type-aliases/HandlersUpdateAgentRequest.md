# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:2551](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2551)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:2555](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2555)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:2559](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2559)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:2563](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2563)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:2567](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2567)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:2571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2571)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:2575](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2575)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:2581](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2581)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:2585](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2585)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:2589](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2589)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:2593](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2593)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:2599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2599)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:2603](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2603)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:2607](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2607)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:2611](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2611)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:2615](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2615)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2619](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2619)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:2623](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2623)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:2627](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2627)

Tagline is a short one-liner for marketplace cards.
