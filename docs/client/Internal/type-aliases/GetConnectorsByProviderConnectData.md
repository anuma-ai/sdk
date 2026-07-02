# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9924](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9924)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9925](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9925)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9926](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9926)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9932)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9938](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9938)
