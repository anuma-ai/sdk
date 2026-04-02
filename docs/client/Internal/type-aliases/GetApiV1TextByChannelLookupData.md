# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:5336](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5336)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:5337](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5337)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:5338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5338)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:5344](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5344)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:5350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#5350)
