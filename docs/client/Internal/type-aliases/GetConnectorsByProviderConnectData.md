# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10423](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10423)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10424](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10424)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10425](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10425)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10431](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10431)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10437](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10437)
