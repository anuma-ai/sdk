# LlmapiImageGenerationExtraFields

> **LlmapiImageGenerationExtraFields** = `object`

Defined in: src/client/types.gen.ts:327

ExtraFields contains additional metadata such as provider/model information.

## Properties

### model\_requested?

> `optional` **model\_requested**: `string`

Defined in: src/client/types.gen.ts:331

ModelRequested is the model identifier that the client asked for.

***

### provider?

> `optional` **provider**: `string`

Defined in: src/client/types.gen.ts:335

Provider is the gateway that serviced this request.

***

### request\_type?

> `optional` **request\_type**: `string`

Defined in: src/client/types.gen.ts:339

RequestType is always "image\_generation".
