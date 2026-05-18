# HandlersAgentResponse

> **HandlersAgentResponse** = `object`

Defined in: [src/client/types.gen.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#217)

## Properties

### agent\_server\_url?

> `optional` **agent\_server\_url**: `string`

Defined in: [src/client/types.gen.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#221)

AgentServerURL is the URL of the agent's server runtime endpoint.

***

### category

> **category**: `string`

Defined in: [src/client/types.gen.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#225)

Category groups agents by use case.

***

### color?

> `optional` **color**: `string`

Defined in: [src/client/types.gen.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#229)

Color is a hex or CSS variable for agent theming.

***

### created\_at

> **created\_at**: `string`

Defined in: [src/client/types.gen.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#233)

CreatedAt is when the agent was created.

***

### description

> **description**: `string`

Defined in: [src/client/types.gen.ts:237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#237)

Description is a short description of the agent's purpose.

***

### display\_order?

> `optional` **display\_order**: `number`

Defined in: [src/client/types.gen.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#241)

DisplayOrder controls the sort position in listing endpoints (lower = first).

***

### example\_conversations?

> `optional` **example\_conversations**: `object`\[]

Defined in: [src/client/types.gen.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#245)

ExampleConversations is a list of sample Q\&A pairs for the marketplace.

**Index Signature**

\[`key`: `string`]: `string`

***

### features?

> `optional` **features**: `string`\[]

Defined in: [src/client/types.gen.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#251)

Features is a list of user-facing capability descriptions.

***

### icon\_url?

> `optional` **icon\_url**: `string`

Defined in: [src/client/types.gen.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#255)

IconURL is the URL to the agent's icon.

***

### id

> **id**: `number`

Defined in: [src/client/types.gen.ts:259](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#259)

ID is the unique identifier.

***

### is\_featured?

> `optional` **is\_featured**: `boolean`

Defined in: [src/client/types.gen.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#263)

IsFeatured indicates whether to highlight the agent in the marketplace.

***

### model\_config?

> `optional` **model\_config**: `object`

Defined in: [src/client/types.gen.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#267)

ModelConfig is the model whitelist, display names, and descriptions.

**Index Signature**

\[`key`: `string`]: `unknown`

***

### name

> **name**: `string`

Defined in: [src/client/types.gen.ts:273](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#273)

Name is the human-readable name.

***

### parent\_id?

> `optional` **parent\_id**: `number`

Defined in: [src/client/types.gen.ts:277](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#277)

ParentID is the optional parent agent ID for sub-agent relationships.

***

### phone\_number?

> `optional` **phone\_number**: `string`

Defined in: [src/client/types.gen.ts:281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#281)

PhoneNumber is the SMS-reachable phone number for text-enabled agents.

***

### recommended\_model?

> `optional` **recommended\_model**: `string`

Defined in: [src/client/types.gen.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#285)

RecommendedModel is the suggested default model.

***

### runtimes?

> `optional` **runtimes**: `string`\[]

Defined in: [src/client/types.gen.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#289)

Runtimes is the list of runtime environments the agent supports (e.g., "client", "server").

***

### skills?

> `optional` **skills**: `string`\[]

Defined in: [src/client/types.gen.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#293)

Skills is the list of skill identifiers bound to this agent.

***

### status

> **status**: `string`

Defined in: [src/client/types.gen.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#297)

Status is the agent's availability: "active", "coming\_soon", or "disabled".

***

### system\_prompt?

> `optional` **system\_prompt**: `string`

Defined in: [src/client/types.gen.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#301)

SystemPrompt is the curated system prompt.

***

### tagline?

> `optional` **tagline**: `string`

Defined in: [src/client/types.gen.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#305)

Tagline is a short one-liner for marketplace cards.

***

### updated\_at

> **updated\_at**: `string`

Defined in: [src/client/types.gen.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#309)

UpdatedAt is when the agent was last updated.
