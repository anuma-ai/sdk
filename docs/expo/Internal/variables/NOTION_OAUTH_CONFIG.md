# NOTION\_OAUTH\_CONFIG

> `const` **NOTION\_OAUTH\_CONFIG**: `object`

Defined in: [src/lib/auth/notion-primitives.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/notion-primitives.ts#21)

Well-known Notion MCP OAuth endpoints (fallback values).

## Type Declaration

### authorizationEndpoint

> `readonly` **authorizationEndpoint**: `"https://api.notion.com/v1/oauth/authorize"` = `"https://api.notion.com/v1/oauth/authorize"`

Fallback authorization endpoint.

### mcpBase

> `readonly` **mcpBase**: `"https://mcp.notion.com"` = `"https://mcp.notion.com"`

Base URL for the Notion MCP server.

### registrationEndpoint

> `readonly` **registrationEndpoint**: `"https://api.notion.com/v1/oauth/register"` = `"https://api.notion.com/v1/oauth/register"`

Fallback dynamic client registration endpoint (RFC 7591).

### tokenEndpoint

> `readonly` **tokenEndpoint**: `"https://api.notion.com/v1/oauth/token"` = `"https://api.notion.com/v1/oauth/token"`

Fallback token endpoint.
