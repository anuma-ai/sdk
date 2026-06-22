# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9703](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9703)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9704](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9704)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9705)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9711](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9711)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9717)
