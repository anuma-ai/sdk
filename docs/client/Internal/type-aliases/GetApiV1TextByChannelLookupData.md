# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:6342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6342)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:6343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6343)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:6344](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6344)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:6350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6350)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:6356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6356)
