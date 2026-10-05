# clearModelsCache

> **clearModelsCache**(): `void`

Defined in: [src/react/useModels.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/react/useModels.ts#27)

Remove all cached model lists.
Call this when the user signs in or out and the next list must come from the server.
The cache key also contains a hash of the auth token, so a token change misses the cache.

## Returns

`void`
