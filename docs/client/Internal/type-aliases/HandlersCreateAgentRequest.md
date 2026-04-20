# HandlersCreateAgentRequest

> **HandlersCreateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#362)

## Properties

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#366)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:370](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#370)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#374)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#378)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#382)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#388)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#392)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#396)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:400](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#400)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:406](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#406)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:410](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#410)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#414)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:418](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#418)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:422](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#422)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#426)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:430](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#430)

Tagline is a short one-liner for marketplace cards.
