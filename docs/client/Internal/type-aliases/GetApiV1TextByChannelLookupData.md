# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:4111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4111)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4112)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4113](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4113)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:4119](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4119)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:4125](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4125)
