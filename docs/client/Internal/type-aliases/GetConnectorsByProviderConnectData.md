# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9912](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9912)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9913](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9913)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9914](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9914)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9920](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9920)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9926)
