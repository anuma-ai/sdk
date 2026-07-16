# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10359](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10359)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10360)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10361](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10361)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10367](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10367)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10373](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10373)
