# HandlersUpdateAgentRequest

> **HandlersUpdateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:3260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3260)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:3264](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3264)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:3268](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3268)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:3272](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3272)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:3276](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3276)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:3280](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3280)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:3284](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3284)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:3290](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3290)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:3294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3294)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:3298](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3298)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:3302](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3302)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:3308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3308)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:3312](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3312)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:3316](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3316)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:3320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3320)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:3324](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3324)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:3328](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3328)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:3332](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3332)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:3336](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3336)

Tagline is a short one-liner for marketplace cards.
