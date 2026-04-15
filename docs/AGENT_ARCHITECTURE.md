# Agent Architecture

## What is an agent

 - An agent is a system prompt + a list of tools. When invoked, the prompt and tools are sent to the LLM. The LLM decides which tools to call, executes them via the SDK tool loop, and returns a response. The portal provides inference and MCP tools but has no agent awareness.
 - An LLM in this context is an orchestration layer and not an execution layer, for the majority of tasks, especially ones that are deterministic, the task should be offloaded to tools. 
## How it works


```
User prompt
  ↓
Agent attaches: system prompt + tools (custom + MCP)
  ↓
SDK sends to Portal → LLM
  ↓
LLM reasons, calls tools as needed:
  - Custom tool → SDK runs executor locally (browser or Node)
  - MCP tool → Portal runs executor server-side
  ↓
Tool results go back to LLM → LLM reasons again → may call more tools
  ↓
Loop ends when LLM responds with text (no more tool calls)
  ↓
Response returned to user
```

## Components

**Portal** — inference (bifrost), billing, MCP tools (web search, image gen, etc.). Unchanged. No agent logic.

**SDK** — provides `buildSystemPrompt()` and `runToolLoop()` as utilities. Framework, not a service.

**Tool packages** — self-contained packages with tool schemas + executor functions. Each package defines what the tool does (schema) and how it runs (executor). 

**Agents** — a config (system prompt + tool list) stored in the agent config DB. Clients fetch this config and use it to drive the tool loop. The agent itself has no runtime — the client is the runtime.

## Agent definition

Stored in DB:
```
{ prompt: "...", tools: ["create_file"], mcpTools: ["JinaMCP-search_web"] }
```

At runtime, the client builds the prompt (used as-is for static prompts like App Builder, or interpolated with user variables for template prompts like Haven) and resolves tool names into one list:
```
runToolLoop({
  prompt: "You are Haven... analyze under CA law...",
  tools: [
    { name: "JinaMCP-search_web", ... },                   // resolved from portal GET /api/v1/tools
    { name: "analyze_subscriptions", ..., executor: fn },   // resolved from SDK tool package
  ]
})
```

## Tool types

**MCP tools** — provided by the portal. Executed server-side. Available to all agents. Examples: web search, image generation, financial data.

**Custom tools** — defined in tool packages. Executed client-side by the SDK. Each tool has:
- A schema (name, description, parameters) — sent to the LLM so it knows the tool exists
- An executor function — runs when the LLM calls the tool, returns structured result



## Agent config store

Agent configs are stored in a separate DB/service. Each config contains:
- **Prompt** — static string or template with `{{variables}}`
- **MCP tools** — list of portal tool names the agent needs (e.g. `JinaMCP-search_web`)
- **Custom tools** — list of SDK tool names the agent needs (e.g. `create_file`, `analyze_subscriptions`)

The DB stores tool names, not executors. Custom tool executor code lives in SDK tool packages. Adding a new custom tool requires two steps: add the executor to the SDK, then add the tool name to the agent config.

The client fetches the config, resolves tool names to actual executors from SDK packages, builds the prompt, and runs the tool loop.

## Implementation

```typescript
interface AgentDefinition {
  buildPrompt: (context?: Record<string, unknown>) => string | Promise<string>;
  tools: string[];      // custom tool names (e.g. "create_file", "analyze_subscriptions")
  mcpTools: string[];   // portal MCP tool names (e.g. "JinaMCP-search_web")
}
```

Both `tools` and `mcpTools` are string arrays in the config — names only, no code. The client resolves them at runtime:
- **Custom tools**: client imports the executor from SDK tool packages by name → gets a `ToolConfig` with schema + executor
- **MCP tools**: client fetches schemas from portal `GET /api/v1/tools`, filters to the names listed

After resolution, both are merged into a single tool list and sent to `runToolLoop`. The difference is what happens inside the loop.

### Thin agent (Haven — MCP tools only)

```
Client                     Agent Config DB          Portal / LLM
  │                             │                       │
  │── fetch config ────────────>│                       │
  │<── { template, mcpTools } ──│                       │
  │                             │                       │
  │  interpolate(template, user variables)              │
  │  fetch MCP schemas from portal                      │
  │                             │                       │
  │── runToolLoop({ prompt, tools: [web_search] }) ────>│
  │                             │         LLM reasons + │
  │                             │         portal runs   │
  │                             │         web searches  │
  │                             │         internally    │
  │<── final response ──────────────────────────────────│
```

Single LLM call. Portal handles MCP tools internally. No client-side execution.

### Smart agent (App Builder — custom tools)

```
Client                     Agent Config DB          Portal / LLM
  │                             │                       │
  │── fetch config ────────────>│                       │
  │<── { prompt, customTools }──│                       │
  │                             │                       │
  │  resolve tool names → SDK executors                 │
  │                             │                       │
  │── runToolLoop({ prompt, tools }) ──────────────────>│
  │                             │                       │
  │<── tool_call: create_file ──────────────────────────│
  │  SDK runs executor locally (writes to IndexedDB)    │
  │── tool result ─────────────────────────────────────>│
  │                             │                       │
  │<── tool_call: display_app ──────────────────────────│
  │  SDK runs executor locally (renders preview)        │
  │── tool result ─────────────────────────────────────>│
  │                             │                       │
  │<── final response ──────────────────────────────────│
```

Multiple LLM calls. SDK intercepts custom tool calls, runs executors locally, sends results back. Portal is only the inference relay.

## NOTES

Not every agent works on every client. Some tools require a specific environment:

| Tool needs | Works on web | Works on text/SMS | Works on Node |
|---|---|---|---|
| Pure computation | Yes | Yes | Yes |
| HTTP API calls | Yes | Yes | Yes |
| Browser storage (IndexedDB) | Yes | No | No |
| UI rendering (display_app) | Yes | No | No |

The agent decides which tools to include based on where it's running. A text server version of Sentinel includes computation tools but skips display tools.

