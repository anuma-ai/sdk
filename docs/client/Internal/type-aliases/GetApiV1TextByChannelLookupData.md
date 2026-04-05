# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:5343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5343)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:5344](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5344)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5345](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5345)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:5351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5351)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:5357](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5357)
