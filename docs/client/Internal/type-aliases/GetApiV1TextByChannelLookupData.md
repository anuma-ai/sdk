# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:4226](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4226)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4227](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4227)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4228](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4228)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:4234](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4234)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:4240](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4240)
