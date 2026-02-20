# getValidNotionToken

> **getValidNotionToken**(): `string` | `null`

Defined in: [src/lib/auth/notion.ts:960](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/auth/notion.ts#L960)

Synchronous getter for the current Notion access token.
Reads from the in-memory cache populated by async operations
(getNotionAccessToken, handleNotionCallback, refreshNotionToken).
Matches the sync signature required by tool factories in src/tools/notion.ts.

## Returns

`string` | `null`
