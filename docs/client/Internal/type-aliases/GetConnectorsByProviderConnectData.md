# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:11124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11124)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:11125](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11125)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:11126](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11126)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:11132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11132)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:11138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11138)
