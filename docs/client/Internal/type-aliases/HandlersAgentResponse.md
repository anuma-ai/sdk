# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#149)

## Properties

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#153)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#157)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#161)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#165)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#169)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#173)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:179](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#179)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:183](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#183)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#187)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#191)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#195)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#201)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#205)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#209)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#213)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#217)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#221)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#225)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#229)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#233)

UpdatedAt is when the agent was last updated.
