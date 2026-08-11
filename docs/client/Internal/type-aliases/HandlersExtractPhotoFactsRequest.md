# HandlersExtractPhotoFactsRequest

> **HandlersExtractPhotoFactsRequest** = `object`

Defined in: [src/client/types.gen.ts:2111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2111)

## Properties

### caption?

> `optional` **caption**: `string`

Defined in: [src/client/types.gen.ts:2116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2116)

Caption is the user's own text for the photo. Optional. It is grounding
context for extraction, not a second source to reconcile against the photo.

***

### image\_url?

> `optional` **image\_url**: `string`

Defined in: [src/client/types.gen.ts:2121](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2121)

ImageURL is a publicly reachable http(s) URL. The provider fetches it
server-side, so it must be reachable from the internet, not from us.
