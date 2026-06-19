# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:2588](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2588)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:2592](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2592)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:2596](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2596)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:2600](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2600)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:2604](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2604)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:2608](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2608)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:2612](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2612)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:2618](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2618)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:2622](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2622)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:2626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2626)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:2630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2630)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:2636](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2636)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:2640](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2640)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:2644](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2644)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:2648](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2648)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:2652](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2652)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2656](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2656)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:2660](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2660)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:2664](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2664)

Tagline is a short one-liner for marketplace cards.
