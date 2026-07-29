# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10685](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10685)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10686](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10686)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10687](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10687)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10693](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10693)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10699](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10699)
