# Agent Architecture

High-level overview. For specifics see [AGENT_SERVER.md](./AGENT_SERVER.md) (server runtime + auth) and [AGENT_MIGRATION.md](./AGENT_MIGRATION.md) (migrating existing agents).

## What is an agent

An agent is a config (prompt + tool list + model) plus a tool loop. The config defines what the agent does; the SDK's `runToolLoop` drives the back-and-forth with the LLM. The LLM orchestrates; tools do the deterministic work.

Configs ship as npm packages so the same agent can run in multiple places.

## Runtimes

Each agent declares which runtimes it supports:

- **`client`** - runs in the caller's process (e.g. a browser in Anuma Chat, mobile app, CLI). Uses the existing Privy-JWT → portal path.
- **`server`** - runs in a hosted agent server. Reached over OAuth. Enables scheduled / autonomous runs, programmatic access, and third-party distribution.
- **`["client", "server"]`** - both. The caller picks based on context.

Runtimes are additive. Most agents will ship dual-runtime. A client-only agent is fine (e.g. tools tied to the DOM). A server-only agent is fine (e.g. scheduled data pipeline).

## Topology

```
                      ┌──────────────────────┐
                      │        Portal        │
                      │  • OAuth + registry  │
                      │  • Inference         │
                      │  • MCP tools         │
                      └──────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
   Privy JWT direct       OAuth bearer            OAuth bearer
         │                       │                       │
┌────────┴────────┐   ┌──────────┴─────────┐   ┌─────────┴─────────┐
│   Anuma Chat    │   │  Anuma agent       │   │ Fitness agent     │
│   (client)      │   │  server            │   │ server            │
│                 │   │  (first-party)     │   │ (third-party)     │
│                 │   │                    │   │                   │
│  runs slide-    │   │  runs slide-deck,  │   │  runs fitness-    │
│  deck locally   │   │  app-creator,      │   │  coach            │
│  via runToolLoop│   │  sentinel          │   │                   │
│                 │   │                    │   │                   │
│  npm: @anuma/   │   │  npm: @anuma/      │   │  npm: @fitness/   │
│   agent-slide-  │   │   agent-slide-     │   │   agent-coach     │
│   deck, sdk     │   │   deck, ..., sdk   │   │  + @anuma/sdk     │
└─────────────────┘   └────────────────────┘   └───────────────────┘
```

Note that `@anuma/agent-slide-deck` runs in both Anuma Chat (client) and on the Anuma agent server. Same package, same config, two runtimes. The caller decides which.

## Components

- **Portal** - OAuth authorization server, agent registry (auth metadata only), inference, MCP tools. Does not store prompts, tools, or model choices.
- **SDK** (`@anuma/sdk`) - `runToolLoop`, tool primitives (`ToolConfig`, storage adapter interfaces), OAuth client helpers. Imported by every runtime.
- **Agent packages** (`@anuma/agent-*` for first-party, any npm package for third-party) - ship the agent config. Consumed by whichever runtime hosts the agent.
- **Agent servers** - optional server runtime. Anuma runs one for first-party agents. Third parties run their own. Each imports the SDK plus the agent packages it hosts.
- **Clients** - any authenticated launcher (Anuma Chat, mobile, CLI, third-party programs). Invoke agents via client runtime or server runtime.

## Agent config (shipped in an npm package)

```ts
export const slideDeckAgent = {
  id: "slide-deck",
  runtimes: ["client", "server"],
  prompt: "...",
  tools: [...],      // schemas + executor refs
  model: "...",
};
```

Both the client and any agent server import this object. Changing the prompt or tool list = package version bump + whoever consumes it redeploys / updates.

## Tool types

- **MCP tools** - executed on portal. Reached by whichever runtime with the user's credential (Privy JWT or OAuth bearer).
- **Custom tools** - executor code ships in the agent package or SDK. Runs in-process in whichever runtime hosts the agent.

Custom tools that touch state go through a storage adapter (e.g. `AppFileStorage`). Two default adapters ship:

- **Client adapter** - backed by local storage (IndexedDB / equivalent). Used when the agent runs in the client runtime.
- **Server adapter** - session-scoped in-memory map that emits mutation events in the outgoing stream. Used when the agent runs in the server runtime.

Same executor code, different adapter.

## Implementation (generic)

A turn, regardless of runtime:

1. Caller resolves the agent's config from the npm package.
2. Caller authenticates - Privy JWT (client runtime) or OAuth bearer (server runtime).
3. SDK's `runToolLoop` is invoked with the config and the user's messages.
4. Loop calls portal `/chat/completions` with the prompt + tools + messages.
5. LLM reasons, may call tools:
   - Custom tool → SDK runs the executor in-process, feeds result back.
   - MCP tool → Portal runs the executor, returns result.
6. Loop repeats until the LLM responds with text.
7. Output streams back to the caller as typed events (text deltas, tool-call events, render instructions, final message).
8. Caller applies any mutations to its local state.

The only difference between runtimes is *where* the loop runs and *which auth credential* it carries. The loop itself, the tool schemas, and the executors are identical.

## What portal adds (minimum)

- OAuth 2.0 authorization server (authorize / token / revoke / JWKS) for the server runtime path.
- Agent registry - auth and routing columns only: `agent_id`, `client_id`, `client_secret`, `allowed_scopes`, `agent_server_url`, `owner_org`, `status`.
- Grants table - `(user_id, agent_id, scopes, spending_cap)`.
- Bearer-token middleware on inference / MCP / artifact endpoints, alongside existing Privy middleware.
- Granted-agents dashboard for users: see, revoke, adjust spend caps.

Portal does not store agent prompts, tools, models, or any other implementation detail. Those live in the agent package.

## Open items

- Cross-runtime state: whether (and how) client-runtime and server-runtime executions of the same agent share artifacts. The current stance is isolated worlds (caller brings state); a portal-hosted shared artifact store is the alternative if the UX demands it.
