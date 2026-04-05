# HandlersCreateAgentRequest

> **HandlersCreateAgentRequest** = `object`

Defined in: [src/client/types.gen.ts:379](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#379)

## Properties

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:383](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#383)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:387](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#387)

Color is a hex or CSS variable for agent theming.

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:391](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#391)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:395](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#395)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:399](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#399)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:405](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#405)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:409](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#409)

IconURL is the URL to the agent's icon.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:413](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#413)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:417](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#417)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#423)

Name is the human-readable name of the agent.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:427](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#427)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:431](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#431)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:435](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#435)

Skills is the list of skill identifiers bound to this agent.

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:439](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#439)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:443](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#443)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:447](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#447)

Tagline is a short one-liner for marketplace cards.
