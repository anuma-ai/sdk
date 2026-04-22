# Agent Migration

Companion to [AGENT_SERVER.md](./AGENT_SERVER.md). Concrete steps to move existing agents (Sentinel, App Creator) from the current client-runtime model to the agent-server model.

## Topology

```
┌────────────────┐   ┌────────────────┐   ┌────────────────────┐
│   Anuma Chat   │   │ Mobile client  │   │ Other authenticated│
│  (IndexedDB)   │   │                │   │      client        │
└───────┬────────┘   └───────┬────────┘   └──────────┬─────────┘
        │                    │                       │
        │         OAuth consent + per-turn calls     │
        └──────────┬─────────┴────────────┬──────────┘
                   │                      │
                   ▼                      ▼
      ┌────────────────────────┐   ┌────────────────────────┐
      │  Anuma agent server    │   │  Fitness agent server  │
      │  (first-party)         │   │  (third-party)         │
      │                        │   │                        │
      │  /agents/sentinel      │   │  /agents/fitness       │
      │  /agents/app-creator   │   │                        │
      └───────────┬────────────┘   └───────────┬────────────┘
                  │                            │
                  └─────────────┬──────────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │         Portal         │
                   │  • OAuth server        │
                   │  • Agent registry      │
                   │  • Inference + MCP     │
                   └────────────────────────┘
```

Multiple clients can launch agents; Anuma Chat is the reference client. First-party agents live on Anuma's agent server; third parties run their own (one or more). All agent servers talk to the portal for auth, inference, and MCP.

## Background

- Any authenticated client can launch an agent - Anuma Chat today, mobile and third-party clients later. Each client owns its own local storage (Anuma Chat uses IndexedDB via WatermelonDB) and is the source of truth for the user data it holds.
- Agent server receives only the information needed for a single tool-loop turn. It persists session metadata (OAuth tokens, scheduled jobs) but no user content.
- Tool executor code (e.g. `create_file`) does not change - the same SDK package runs, just on the agent server instead of in the browser. What changes is **where** it reads/writes state.
- Regular chat keeps its existing Privy-JWT → portal direct path. Only agent flows move behind the agent server.
- Prompt, tool list, and model live with the agent server. Portal holds only the registry (auth + routing). Persona / memory / style is dropped as a portal concept - each agent manages its own prompt locally.

## Shared migration (applies to every agent)

1. **Register the agent in the portal registry**
   - New row: `{ agent_id, client_id, client_secret, owner_org: "anuma", allowed_scopes, status: "active" }`.
   - Seed at deploy time for first-party agents. No UI flow needed for us.

2. **Add the agent config to the agent server**
   - Prompt, tool list, and model live with the agent server (code, not portal config).
   - Resolve tool names to SDK tool-package executors at boot.
   - Route per agent: `POST /agents/{id}/turn`.

3. **Define OAuth scopes for the agent**
   - Each tool it uses → scope string (e.g. `tool:create_file`, `mcp:search_web`, `artifact:file:write`, `offline_access` if scheduled).
   - Add scopes to the registry row's `allowed_scopes`.

4. **Wire the client to the agent server**
   - On first invocation, the client runs the OAuth consent flow for the agent (auto-grant path for first-party agents - redirect is headless).
   - Client stores the issued scoped access token; uses it on every subsequent turn.
   - Client sends `POST /agents/{id}/turn` with `{ session_id, user_message, scoped_context }` where `scoped_context` is *only what the tool loop needs* (see per-agent sections).
   - Client consumes the SSE stream: `text_delta`, `tool_call_start`, `tool_call_done`, `render_instruction`, `error`, `message_done`.

5. **Remove client-side `runToolLoop` for this agent**
   - The client stops importing `runToolLoop`, stops assembling tool configs, stops running executors.
   - Keeps: sending context, consuming the stream, applying results to its local storage.

6. **Verify**
   - Turn round-trip works end-to-end.
   - Streaming events render in the existing UI.
   - Client-side state after a turn matches what the client-runtime produced before.

## Per-agent migration

### Sentinel

**What it is today**

- Portal agent config: `system_prompt` (static), `skills: [...]` - list of portal-resolved tool IDs. Post-migration both move to the agent server.
- No custom client storage of its own beyond the shared conversation history.
- Runs by the client fetching the config and calling `runToolLoop({ prompt, tools: resolved(skills) })`.

**Tool footprint** (read from portal config - assumed analyst/web-search shape)

- MCP tools only (web search, financial data, etc.). No custom executors.

**Migration steps**

1. Shared steps 1–3 - register `sentinel`, load config on agent server, map `skills` to MCP scopes (`mcp:search_web`, `mcp:financial:*`, etc.).
2. Consent grant at first use - first-party auto-grant, scopes pulled from the portal config's `skills[]`.
3. Client replaces its direct portal call with `POST /agents/sentinel/turn`.
4. `scoped_context` sent per turn: last-N messages from the conversation's local thread. Nothing else. No user persona or memory - those are applied by portal on the inference call.
5. Stream consumer unchanged (Sentinel produces text only; no artifact or render events).
6. Scheduled runs (if Sentinel ever needs them) require `offline_access` scope at consent; agent server stores the cron job.

**What stays on the client**

- Full conversation history. Client decides per turn what subset to pass as `scoped_context`.

**What the agent server sees**

- One turn's scoped messages + model + tool allow-list. That's it.

---

### App Creator (App Builder)

**What it is today**

- Tools defined in `src/tools/appGeneration.ts` - `create_file`, `patch_file`, `delete_file`, `read_file`, `list_files`, `display_app`.
- Executors receive an `AppFileStorage` adapter. Anuma Chat supplies a WatermelonDB-on-IndexedDB implementation - files live client-side as `StoredAppFile { conversationId, path, content }`.
- Client calls `runToolLoop` with these tools wired. LLM calls `create_file` (etc.) → executor writes to the client's local storage → UI reads it and renders. `display_app` emits a preview via a callback.

**Migration model - files stay on the client**

To preserve the privacy rule (agent server gets only what it needs), file storage does **not** move to a server artifact store. The client's local store remains canonical. The tool loop gets a snapshot per turn and emits file mutations that the client applies on receipt.

**Migration steps**

1. Shared steps 1–3 - register `app-creator`, scopes: `tool:create_file`, `tool:patch_file`, `tool:delete_file`, `tool:read_file`, `tool:list_files`, `tool:display_app`.
2. Tool executors move server-side but change their backing store from `AppFileStorage` to an **in-memory session map** seeded from the client's snapshot:
   - Turn begins: client sends `scoped_context = { messages, fileSnapshot: StoredAppFile[] }` for the current conversation.
   - Agent server constructs a session-scoped in-memory `Map<path, content>` from the snapshot, passes a `SessionFileStorage` wrapper to the SDK tool factory (`createAppGenerationTools`).
   - `create_file` / `patch_file` / `delete_file` mutate the in-memory map *and* emit a `tool_call_done` event with `{ name, args, result, mutation: { op, path, content } }`.
   - Client consumes the stream, applies each mutation to its local store.
   - Turn ends: in-memory map is discarded. Agent server retains nothing.
3. `display_app` becomes a pure render instruction emitted as an SSE event. Client reads its own local store to render the preview (same as today, just the trigger comes over the wire instead of from a local callback).
4. `read_file` / `list_files` also read from the session-scoped map. Since the snapshot is seeded from the client, reads are consistent with what the user sees.
5. Streaming artifact previews (`onToolCallArgumentsDelta` today - live typing of HTML as it generates) surface as `tool_call_arguments_delta` SSE events; client wires them into the same live-preview UI.
6. Shared steps 4–6 - client wires the new endpoint, stops running the local tool loop, consumes the stream, verifies parity.

**Minimal context the client sends per turn**

- `messages` - conversation history slice relevant to the turn.
- `fileSnapshot` - current files for this conversation (could be diffed against server's session if we keep the session open across turns, but simplest is re-sending the snapshot per turn; files are small).

**Everything else stays in the client**

- Local file records, project metadata, preview state, user's draft messages.

## Auth specifics per agent

- Every agent goes through the OAuth consent flow once per user. First-party agents are auto-granted - the consent "screen" is headless.
- Scopes requested per agent:
  - **Sentinel** - the MCP scopes its `skills[]` expands to (e.g. `mcp:search_web`). No artifact scopes. No `offline_access` unless scheduled.
  - **App Creator** - `tool:create_file`, `tool:patch_file`, `tool:delete_file`, `tool:read_file`, `tool:list_files`, `tool:display_app`. No MCP. No `offline_access`.
- Client holds the issued access token per `(user, agent)`. Refresh on expiry via agent server's `/token` refresh call - transparent to the user.
- Revocation: user can revoke an agent from the granted-agents dashboard on the portal. Next refresh fails; client re-prompts (or re-triggers consent silently for first-party).

## runToolLoop specifics

- **Where it runs now**: client, imported from `@anuma/sdk`.
- **Where it runs after migration**: agent server, importing the *same* code from `@anuma/sdk`. No fork.
- **Loop inputs change**: previously the client supplied tool executors directly; post-migration the agent server resolves executors from SDK tool packages using the agent config's `skills[]` list.
- **Loop outputs change**: previously callbacks (`onData`, `onToolCall`, `onToolCallArgumentsDelta`, `onStepFinish`) fired in-process. Post-migration, these emit as SSE events on the wire. The SDK may ship a helper (`toolLoopToSSE`) that adapts the existing callbacks to the standard event schema - so the tool loop itself doesn't need modification.
- **Topological execution, dependsOn, skipContinuation, removeAfterExecution** - all preserved. Server-side execution doesn't change semantics.

## Open items

- Exact `skills[]` → scope mapping: requires an audit of each agent's current portal config.
- Snapshot size ceiling for App Creator - if a conversation accumulates many files, the per-turn snapshot may get large. If this becomes a problem, switch to a session-persistent in-memory map seeded once and mutated across turns (still in-memory, still discarded on session end).
