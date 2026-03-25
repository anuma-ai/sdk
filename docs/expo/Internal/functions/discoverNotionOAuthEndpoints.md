# discoverNotionOAuthEndpoints

> **discoverNotionOAuthEndpoints**(): `Promise`<[`NotionOAuthEndpoints`](../interfaces/NotionOAuthEndpoints.md)>

Defined in: [src/lib/auth/notion-primitives.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/notion-primitives.ts#186)

Discover OAuth server metadata from Notion's well-known endpoints.

Follows the two-step RFC 8414 flow:

1. `/.well-known/oauth-protected-resource` to find the authorization server.
2. `<authServer>/.well-known/oauth-authorization-server` for metadata.

Falls back to [NOTION\_OAUTH\_CONFIG](../variables/NOTION_OAUTH_CONFIG.md) if discovery fails.

## Returns

`Promise`<[`NotionOAuthEndpoints`](../interfaces/NotionOAuthEndpoints.md)>
