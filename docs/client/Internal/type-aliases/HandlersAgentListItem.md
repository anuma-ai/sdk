# HandlersAgentListItem

> **HandlersAgentListItem** = `object`

Defined in: [src/client/types.gen.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#59)

## Properties

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#63)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#67)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#71)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#75)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#79)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#83)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#89)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#93)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#97)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#101)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:105](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#105)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#111)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:115](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#115)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#119)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:123](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#123)

RecommendedModel is the suggested default model.

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#127)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:131](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#131)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#135)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:139](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#139)

UpdatedAt is when the agent was last updated.
