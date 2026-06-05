# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:8371](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8371)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:8372](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8372)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:8373](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8373)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:8379](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8379)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:8385](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8385)
