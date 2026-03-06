# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:4065](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4065)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4066](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4066)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4067](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4067)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:4073](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4073)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:4079](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4079)
