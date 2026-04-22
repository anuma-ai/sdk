# Agent Server

Companion to [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md). Describes what changes when agents run on their own server instead of on the client.

Anuma hosts one agent server runtime for all first-party agents. Third-party developers deploy their own agent server(s) to run their own agents.

## Tool calls

- Agent server runs the full tool loop. All tools execute server-side.
- **Custom tools** - executor runs in the agent server process (imported from SDK tool packages).
- **MCP tools** - executor runs in the portal. Unchanged.
- **No client-as-executor round-trips.** Client is a view, not a runtime.
- Artifacts (e.g. `create_file` output) are written to a server-owned artifact store, not to client storage.
- `display_app` becomes a render instruction the agent server emits into the response stream. The client interprets it - the same way it interprets text.
- Tool schemas gain a `runtime` field (`server` / `either`). `runtime: client` tools are rejected at config validation in the server-agent world.

### Flow

```
┌──────────┐        ┌──────────────┐        ┌────────┐        ┌─────┐
│  Client  │        │ Agent server │        │ Portal │        │ LLM │
└────┬─────┘        └──────┬───────┘        └───┬────┘        └──┬──┘
     │                     │                    │                │
     │ POST /turn          │                    │                │
     ├────────────────────>│                    │                │
     │                     │ /chat/completions  │                │
     │                     ├───────────────────>├───────────────>│
     │                     │                    │                │
     │                     │<── tool_call: create_file ──────────│
     │                     │                    │                │
     │   writes artifact   │                    │                │
     │                     │───► artifact store │                │
     │                     │    (server-owned)  │                │
     │                     │                    │                │
     │  progress event     │                    │                │
     │<────────────────────│                    │                │
     │                     │   tool_result      │                │
     │                     ├───────────────────>├───────────────>│
     │                     │                    │                │
     │                     │<── tool_call: search_web (MCP) ─────│
     │                     │                    │                │
     │                     │   portal runs MCP executor in-place │
     │                     │<── tool_result ────│                │
     │                     ├───────────────────────────────────> │
     │                     │                    │                │
     │                     │<── tool_call: display_app ──────────│
     │                     │                    │                │
     │ render_instruction  │                    │                │
     │<────────────────────│                    │                │
     │                     │   tool_result      │                │
     │                     ├───────────────────>├───────────────>│
     │                     │                    │                │
     │   text deltas       │<── text ───────────│                │
     │<────────────────────│                    │                │
     │   done              │                    │                │
     │<────────────────────│                    │                │
```

One SSE stream from agent server to client. Typed events: `text_delta`, `tool_call_start`, `tool_call_done`, `render_instruction`, `message_done`. No request ever goes back from server to client mid-turn - client is purely receiving.

### Open questions

- Artifact store ownership: portal-hosted (shared, user-identity-tied) or agent-server-local (per-agent).
- Cross-agent artifact sharing: typed artifacts, shared vs private tiers, ACL, discovery, events.

## Auth

Portal supports two auth methods, chosen per endpoint:

- **Privy JWT direct** - used by regular chat. Existing path, unchanged.
- **OAuth 2.0 bearer** - used by agent-mediated calls. New path. User consents once per agent; agent server holds a scoped access token and uses it for every turn.

### Regular chat (Privy JWT, unchanged)

```
┌──────────┐   Privy JWT    ┌────────┐
│  Client  │ ─────────────> │ Portal │
│          │ /chat/completions       │
└──────────┘                └────────┘
```

Client sends Privy JWT in `Authorization`. Portal validates and bills the user. No agent server in the path.

### Agent calls (OAuth bearer, new)

```
┌──────────┐  Privy JWT   ┌──────────────┐  OAuth bearer  ┌────────┐
│  Client  │ ───────────> │ Agent server │ ─────────────> │ Portal │
│          │  /turn       │              │ /chat/completions       │
└──────────┘              └──────────────┘                └───┬────┘
                            (one-time OAuth consent               │
                             establishes bearer token;            ▼
                             agent server caches it)    verifies user via
                                                        token.sub,
                                                        deducts balance,
                                                        runs inference
```

Client authenticates to the agent server with its Privy JWT. Agent server uses a scoped OAuth access token (obtained via one-time consent, refreshed as needed) when calling portal. Portal validates the bearer token, identifies the user via the token's `sub` claim, enforces scope, and deducts the balance from that user's account - same billing path as the direct Privy JWT flow.

### Credential summary

- **End user credential** - Privy JWT. Also drives the OAuth consent flow.
- **Agent credential** - `client_id` + `client_secret`, registered in portal (OAuth confidential client).
- **Access token** - short-lived JWT signed by portal; `{ sub: user_id, azp: agent_id, scope, exp }`. Refresh token issued for scheduled / long-lived use (requires `offline_access` scope).
- **Developer API key** - registers and manages agents. Not used at runtime.
- Scopes map to capabilities: `tool:search_web`, `artifact:file:write`, `mcp:gmail:read`, `offline_access`. Portal enforces scope on every call.
- Standard OAuth 2.0 (RFC 6749) + PKCE (RFC 7636); no custom auth.

### Portal changes required

- OAuth 2.0 authorization server: `/authorize`, `/token`, `/revoke`, `.well-known/jwks.json`.
- Tables: `agents` (registry - `agent_id`, client credentials, `allowed_scopes`, `agent_server_url`, `status`) and `grants` (user consent records).
- Bearer-token middleware on inference/MCP/artifact endpoints, alongside the existing Privy middleware.
- Consent UI and granted-agents revocation dashboard.
- Per-`(user, agent)` attribution in billing, usage, rate limits.

Prompt, tool list, and model choice live with the agent server, not portal.

### Storage - portal is the source of truth

- **Agent registry** - portal only.
- **Grant `(user, agent, scopes)`** - portal only. The user's consent record.
- **Refresh token** - portal authoritative; agent server caches/persists it for reuse.
- **Access token (short JWT)** - portal signs; agent server caches until `exp`.
- **Session state, scheduled jobs** - agent server only.

Agent server's token cache is disposable. Revocation from the Anuma dashboard updates the portal grant; the next refresh fails `invalid_grant`, which stops every agent server holding a stale token.

### Flow

```
┌─────────────┐        ┌──────────────┐        ┌────────┐
│    User     │        │ Agent server │        │ Portal │
└──────┬──────┘        └──────┬───────┘        └───┬────┘
       │                      │                    │
       │  1. one-time consent                      │
       │  /authorize?client_id=recipe-agent        │
       │  &scope=search_web+create_file            │
       ├──────────────────────────────────────────>│
       │  [consent screen shown to user]           │
       │<── redirect with ?code=xxx ───────────────│
       │                      │                    │
       │  2. pass auth code   │                    │
       ├─────────────────────>│                    │
       │                      │  /token            │
       │                      │  grant=code        │
       │                      │  + client creds    │
       │                      ├───────────────────>│
       │                      │<── access_token ───│
       │                      │   + refresh_token  │
       │                      │                    │
       │  3. every turn after │                    │
       │  POST /turn          │                    │
       │  + Privy JWT         │                    │
       ├─────────────────────>│                    │
       │                      │  /chat/completions │
       │                      │  Authorization:    │
       │                      │   Bearer <token>   │
       │                      ├───────────────────>│
       │                      │     [portal        │
       │                      │      verifies      │
       │                      │      signature,    │
       │                      │      scope, exp]   │
       │                      │<── response ───────│
       │  stream              │                    │
       │<─────────────────────│                    │
       │                      │                    │
       │  4. scheduled tasks  │                    │
       │  (no user present)   │                    │
       │                      │  /token            │
       │                      │  grant=refresh     │
       │                      ├───────────────────>│
       │                      │<── new access_tok ─│
```

Access tokens are verified by signature (no DB lookup per call). Refresh tokens are opaque, stored in portal, revokable from a consent dashboard.

### MCP tools

MCP tool execution stays on the portal. The new piece is scope enforcement: an agent can only invoke MCPs matching its access token's scopes.

- Agent declares needed MCPs in its registry entry; user's consent grant includes the corresponding scopes (e.g. `mcp:search_web`, `mcp:gmail:read`).
- LLM calls an MCP tool → portal checks the access token's scope before executing.
- **Generic MCPs** (web search, image gen) - scope check only. Portal runs the tool in-process.
- **User-account MCPs** (Gmail, Drive, Notion) - portal holds the user's linked OAuth tokens from the earlier connect flow. It uses them to call the third-party API on the user's behalf. The agent server never sees raw third-party tokens.
- If an agent requests a scope for an MCP the user hasn't connected (e.g. Gmail not linked), the consent screen prompts the user to connect it first - linking and granting can happen in the same flow.
- Revoking the agent's grant stops its MCP access without disconnecting the underlying account (Gmail stays linked for other agents).

### Scheduled tasks

Agent server holds the schedule locally. At tick time it uses the stored refresh token for `(user, agent)` to mint a fresh access token, then runs the turn as if the user were online. Portal bills the user's account on execution. If the user has revoked the grant, the refresh fails and the scheduled run is dropped cleanly. The grant must include the `offline_access` scope - the user explicitly authorizes background runs at consent time.

