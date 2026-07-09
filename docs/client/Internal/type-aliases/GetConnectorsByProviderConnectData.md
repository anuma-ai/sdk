# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10126](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10126)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10127](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10127)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10128)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10134](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10134)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10140)
