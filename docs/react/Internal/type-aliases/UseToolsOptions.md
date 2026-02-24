# UseToolsOptions

> **UseToolsOptions** = `object`

Defined in: [src/react/useTools.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/react/useTools.ts#17)

## Properties

### autoFetch?

> `optional` **autoFetch**: `boolean`

Defined in: [src/react/useTools.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/react/useTools.ts#36)

Whether to fetch tools automatically on mount (default: true)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/react/useTools.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/react/useTools.ts#25)

Optional base URL for the API requests.

***

### getToken()

> **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useTools.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/react/useTools.ts#21)

Custom function to get auth token for API calls

**Returns**

`Promise`<`string` | `null`>

***

### includeTools?

> `optional` **includeTools**: `string`\[]

Defined in: [src/react/useTools.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/react/useTools.ts#32)

Filter to include only specific tools by name.

* undefined: include all tools
* \[]: include no tools
* \['tool1', 'tool2']: include only named tools
