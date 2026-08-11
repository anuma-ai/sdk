# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:11384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11384)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11385](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11385)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11386)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11392)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:11398](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11398)
