# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:5300](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5300)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:5301](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5301)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5302](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5302)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:5308](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5308)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:5314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5314)
