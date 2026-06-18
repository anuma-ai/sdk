# HandlersAgentListItem

> **HandlersAgentListItem** = `object`

Defined in: [src/client/types.gen.ts:1133](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1133)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1137)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:1141](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1141)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1145](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1145)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:1149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1149)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:1153](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1153)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1157](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1157)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1161](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1161)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1167](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1167)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1171](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1171)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:1175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1175)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1179](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1179)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1183](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1183)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:1189](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1189)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1193](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1193)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:1197](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1197)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1201](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1201)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1205](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1205)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1209](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1209)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1213](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1213)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1217](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1217)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1221](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1221)

UpdatedAt is when the agent was last updated.
