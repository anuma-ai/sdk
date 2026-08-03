# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:11135](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11135)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11136)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11137](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11137)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11143)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:11149](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11149)
