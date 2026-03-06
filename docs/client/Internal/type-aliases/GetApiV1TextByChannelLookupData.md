# GetApiV1TextByChannelLookupData

> **GetApiV1TextByChannelLookupData** = `object`

Defined in: [src/client/types.gen.ts:4235](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4235)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:4236](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4236)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:4237](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4237)

**channel**

> **channel**: `string`

Text channel (sms, telegram)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:4243](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4243)

**identifier**

> **identifier**: `string`

Channel identifier (e.g., E.164 phone number for SMS)

***

### url

> **url**: `"/api/v1/text/{channel}/lookup"`

Defined in: [src/client/types.gen.ts:4249](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4249)
