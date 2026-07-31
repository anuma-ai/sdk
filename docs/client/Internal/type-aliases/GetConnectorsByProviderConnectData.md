# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10673](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10673)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10674)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10675](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10675)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10681](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10681)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10687](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10687)
