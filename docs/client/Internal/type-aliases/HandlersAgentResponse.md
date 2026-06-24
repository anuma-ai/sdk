# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:1232](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1232)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1236)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:1240](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1240)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1244](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1244)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:1248](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1248)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:1252](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1252)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1256](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1256)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1260](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1260)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1266](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1266)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1270](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1270)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:1274](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1274)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1278](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1278)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1282](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1282)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:1288](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1288)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1292)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:1296](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1296)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1300)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1304](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1304)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1308)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1312](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1312)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1316](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1316)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1320](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1320)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1324](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1324)

UpdatedAt is when the agent was last updated.
