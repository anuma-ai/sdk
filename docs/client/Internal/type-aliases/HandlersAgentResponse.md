# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:1310](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1310)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1314)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:1318](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1318)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1322)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:1326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1326)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:1330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1330)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1334)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1338)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1344](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1344)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1348](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1348)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:1352](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1352)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1356)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1360)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:1366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1366)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1370](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1370)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:1374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1374)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1378)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1382)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1386)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1390](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1390)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1394](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1394)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1398)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1402](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1402)

UpdatedAt is when the agent was last updated.
