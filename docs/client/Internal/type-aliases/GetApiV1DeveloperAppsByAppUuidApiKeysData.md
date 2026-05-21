# GetApiV1DeveloperAppsByAppUuidApiKeysData

> **GetApiV1DeveloperAppsByAppUuidApiKeysData** = `object`

Defined in: [src/client/types.gen.ts:4953](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4953)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4954](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4954)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4955](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4955)

**app\_uuid**

> **app\_uuid**: `string`

App UUID

***

### query?

> `optional` **query**: `object`

Defined in: [src/client/types.gen.ts:4961](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4961)

**limit?**

> `optional` **limit**: `number`

Maximum number of API keys to return (default 50, max 100)

**offset?**

> `optional` **offset**: `number`

Number of API keys to skip (default 0)

***

### url

> **url**: `"/api/v1/developer/apps/{app_uuid}/api-keys"`

Defined in: [src/client/types.gen.ts:4971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4971)
