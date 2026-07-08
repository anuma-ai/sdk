# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:1250](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1250)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1254](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1254)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:1258](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1258)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1262](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1262)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:1266](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1266)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:1270](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1270)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1274](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1274)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1278](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1278)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1284](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1284)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1288)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:1292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1292)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1296](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1296)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1300)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:1306](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1306)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1310](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1310)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:1314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1314)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1318](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1318)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1322)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1326)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1330)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1334)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1338)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1342)

UpdatedAt is when the agent was last updated.
