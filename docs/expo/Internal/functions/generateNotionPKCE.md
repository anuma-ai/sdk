# generateNotionPKCE

> **generateNotionPKCE**(): `Promise`<[`NotionPKCEChallenge`](../interfaces/NotionPKCEChallenge.md)>

Defined in: [src/lib/auth/notion-primitives.ts:283](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/notion-primitives.ts#283)

Generate a fresh PKCE challenge (code verifier + code challenge + state).

The caller is responsible for storing the `codeVerifier` securely
(e.g. in `expo-secure-store`) so it can be presented during token exchange.

## Returns

`Promise`<[`NotionPKCEChallenge`](../interfaces/NotionPKCEChallenge.md)>
