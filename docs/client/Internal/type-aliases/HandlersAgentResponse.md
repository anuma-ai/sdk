# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:1408](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1408)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1412](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1412)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:1416](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1416)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1420](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1420)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:1424](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1424)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:1428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1428)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1432)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1436](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1436)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1442](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1442)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1446](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1446)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:1450](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1450)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1454](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1454)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1458](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1458)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:1464](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1464)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1468)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:1472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1472)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1476)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1480](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1480)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1484)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1488)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1492](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1492)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1496)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1500](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1500)

UpdatedAt is when the agent was last updated.
