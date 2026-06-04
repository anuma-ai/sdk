# HandlersAgentListItem

> **HandlersAgentListItem** = `object`

Defined in: [src/client/types.gen.ts:1116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1116)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:1120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1120)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:1124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1124)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:1128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1128)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:1132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1132)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:1136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1136)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:1140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1140)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:1144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1144)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:1150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1150)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:1154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1154)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:1158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1158)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:1162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1162)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:1166](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1166)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:1172](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1172)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:1176](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1176)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:1180](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1180)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:1184](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1184)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:1188](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1188)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:1192](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1192)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:1196](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1196)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:1200](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1200)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:1204](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1204)

UpdatedAt is when the agent was last updated.
