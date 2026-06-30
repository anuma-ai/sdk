# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:2659](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2659)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:2663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2663)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:2667](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2667)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:2671](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2671)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:2675](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2675)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:2679](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2679)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:2683](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2683)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:2689](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2689)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:2693](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2693)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:2697](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2697)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:2701](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2701)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:2707](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2707)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:2711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2711)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:2715](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2715)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:2719](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2719)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:2723](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2723)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2727](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2727)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:2731](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2731)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:2735](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2735)

Tagline is a short one-liner for marketplace cards.
