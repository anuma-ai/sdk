# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:1267](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1267)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1271](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1271)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:1275](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1275)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1279](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1279)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:1283](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1283)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:1287](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1287)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1291)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1295)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1301](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1301)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1305)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:1309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1309)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1313](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1313)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1317](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1317)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:1323](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1323)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1327](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1327)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:1331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1331)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1335)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1339)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1343)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1347](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1347)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:1351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1351)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1355](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1355)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1359)

UpdatedAt is when the agent was last updated.
