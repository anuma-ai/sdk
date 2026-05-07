# PromptSeal v0.3 — TypeScript migration into anuma-sdk + memoryless-client

> **Status:** spec, not yet implemented.
> **Scope:** hackathon demo. Localhost-only. No portal changes. Single demo wallet.
> **Audience:** anyone (human or agent) picking up the migration. Read this first.

This document is the canonical reference for the migration of the v0.1 Python
demo into TypeScript, hosted inside `anuma-sdk` and demoed via a `/promptseal-demo`
route in `ai-memoryless-client`. Two parallel implementation plans
(`PLAN_SDK.md`, `PLAN_CLIENT.md`) execute against this spec.

---

## 1. Goal

Reproduce the v0.1 Python demo end-to-end in TypeScript:

- The hiring agent runs in the browser via anuma-sdk's `runToolLoop` (instead
  of LangChain's `AgentExecutor`).
- Every LLM call and tool call emits an Ed25519-signed receipt, hash-chained
  in IndexedDB.
- After the run, the client builds a Merkle tree, anchors the root on Base
  Sepolia from a hardcoded demo wallet via viem.
- The static verifier (`verifier/{index.html, verify.js, canonical.js}`)
  loads at the same Next.js dev server and verifies a pasted receipt
  end-to-end (5 steps, GREEN/RED).
- A "tamper" button corrupts one receipt's payload in IndexedDB; the
  verifier flips RED.

The user-facing audience is identical to the v0.1 demo. Backend / signing
mechanics are entirely client-side. No agent-server, no relayer, no portal.

---

## 2. Source repos and branches

| Repo | Path | Branch (new) | Plan |
|---|---|---|---|
| anuma-sdk | `/Users/tanmay/IdeaProjects/kingpinXD/anuma-sdk` | `promptseal-demo` | PLAN_SDK.md |
| ai-memoryless-client | `/Users/tanmay/IdeaProjects/jedi2002/ai-memoryless-client` | `promptseal-demo` | PLAN_CLIENT.md |
| promptseal (this repo) | `/Users/tanmay/IdeaProjects/kingpinXD/promptseal` | `main` | reference only |

The work happens entirely on the two `promptseal-demo` branches. No upstream
PRs during the hackathon. The promptseal repo stays at v0.1.1 — used as the
reference for byte-equality fixtures and verbatim copy of the verifier files.

---

## 3. Locked-in decisions

These have been debated and locked. Don't relitigate without strong reason.

| # | Decision | Rationale |
|---|---|---|
| D1 | Split `@anuma/sdk/promptseal/` (framework) vs `@anuma/sdk/agents/promptseal/` (agent definition) | Receipt SDK is reusable across agents; hiring agent is one specific consumer. Cheap to split now. |
| D2 | Drop the nested `score_candidate` LLM call. Use synthetic deterministic scores. | The Python `score_candidate` makes an inner Haiku call. Reproducing this in TS requires extracting `streamLlm` from `runToolLoop` (2-3 day refactor). For the demo, `score_candidate` becomes pure JS that returns plausible scores from yoe/education. Loses two inner receipts. |
| D3 | `pnpm link` for SDK linking from client | Hot-reload DX. Fall back to `"@anuma/sdk": "link:../anuma-sdk"` workspace dep if module resolution misbehaves. |
| D4 | Schema signing is V2 (post-demo) | Strict Python v0.1 schema parity for V1. Cross-language fixtures stay intact. ~50 lines additive when added later. |
| D5 | Reuse the Ed25519 agent key already bound to ERC-8004 token #633 | Token #633 is on Base Sepolia. New keypair would require new on-chain registration. The TS code reads `agent_key.pem` (PKCS8 PEM) at build time and emits raw 32-byte secret as a base64 env var. |
| D6 | Hardcoded demo Base Sepolia EOA pays gas | Address `0x9718C1CF0C96dde2fb9D820d06785A976972DE2A`. Faucet-funded testnet ETH. Private key in `.env.demo` (gitignored). Same trust shape as the Python `.env DEPLOYER_PRIVATE_KEY`. |
| D7 | Skip the v0.2 dashboard | The `/promptseal-demo` route's three-panel UI covers the demo's operator-UI needs. Tree view + evidence pack import are post-hackathon. |
| D8 | Verifier served from same Next.js dev server, no separate UI | Static files copied to `apps/web/public/promptseal-verifier/` from `@anuma/sdk/promptseal/verifier/`. Different visual style and route — feels separate to the audience but is one server. |
| D9 | Demo agent appears in the existing `AgentSelectorModal` | Discoverable via existing `+ → Agents` flow. One client-side entry augments the agent list. Selection routes to `/promptseal-demo`. |
| D10 | No mobile, no auth, no Privy gating | Public localhost route. Mobile parity is V2. |

---

## 4. Architecture overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ ai-memoryless-client / apps/web                                      │
│                                                                       │
│  /chat (existing)                                                     │
│   └─ + button → AgentSelectorModal → click "PromptSeal Hiring Demo"  │
│       └─ router.push('/promptseal-demo')                              │
│                                                                       │
│  /promptseal-demo (new route)                                         │
│   ├─ AgentHeader      pubkey + token #633 + basescan link            │
│   ├─ ResumePicker     5 fixed candidates                             │
│   ├─ ReceiptStream    live cards subscribed to IndexedDB             │
│   ├─ AnchorPanel      anchor / verify / tamper                       │
│   └─ uses useHiringDemo() from @anuma/sdk/agents/promptseal          │
│                                                                       │
│  /promptseal-verifier/* (static files, copied from SDK)              │
│    └─ accepts ?receipt=...&proof=...&tx=... query params for prefill │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ @anuma/sdk (branch: promptseal-demo)                                 │
│                                                                       │
│  src/lib/chat/toolLoop.ts (MODIFIED)                                  │
│    └─ adds onLlmStart/End, onToolStart/End, runId                    │
│                                                                       │
│  src/promptseal/ (NEW — framework receipt SDK)                       │
│    ├─ canonical.ts crypto.ts receipt.ts chain.ts                     │
│    ├─ merkle.ts anchor.ts erc8004.ts hooks.ts                        │
│    └─ verifier/ (static files: index.html, verify.js, canonical.js)  │
│                                                                       │
│  src/agents/promptseal/ (NEW — hiring agent definition)              │
│    ├─ tools.ts (createHiringTools)                                   │
│    ├─ prompt.ts (buildHiringSystemPrompt)                            │
│    ├─ data/resumes.json                                              │
│    └─ useHiringDemo.ts (React hook wrapping useChatSubmitHandler)    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────┐   ┌─────────────────────┐  ┌─────────────────┐
│ Anthropic API       │   │ IndexedDB           │  │ Base Sepolia    │
│ (Sonnet)            │   │ (chain table)       │  │ via viem        │
└─────────────────────┘   └─────────────────────┘  └─────────────────┘
```

---

## 5. Runtime flow (post-integration)

```
T+0      User on /chat. Clicks +. Clicks "Agents" pill.
         AgentSelectorModal shows existing agents + "PromptSeal Hiring Demo".

T+5s     Click PromptSeal entry → router.push('/promptseal-demo').

T+5s+    Page mounts. useHiringDemo() initializes:
            - reads agent SK from env (base64 of agent_key.pem)
            - reads demo wallet SK from env
            - opens IndexedDB receipt store

T+10s    User picks "Bob Martinez (res_002)". Clicks Run.
            useHiringDemo.run("res_002") executes:
              - generates runId UUID
              - opens run row in IndexedDB
              - invokes useChatSubmitHandler({
                  messages: [...system, {role:'user', content:'Screen res_002...'}],
                  clientTools: createHiringTools(),
                  model: 'claude-sonnet-4-6',
                  maxToolRounds: 6,
                  onLlmStart, onLlmEnd, onToolStart, onToolEnd,  ← from createPromptSealHooks()
                })

T+10s+   For each LLM/tool boundary:
            hook fires → builds Receipt → canonicalize → SHA-256 → Ed25519 sign
            → ReceiptChain.append() validates parent_hash + signature, INSERTS
            → ReceiptStream.tsx subscribes via Dexie observable, renders new card

T+~3s    Loop completes. ~14 receipts emitted. Chain integrity verified.
         AnchorPanel transitions: idle → run-complete.

T+next   User clicks "Anchor on Base Sepolia".
            buildMerkle(receipts.map(r => r.event_hash)) → root
            walletClient.sendTransaction({to:self, value:0n, data:root, ...})
            wait 1 confirmation
            chain.recordAnchor(runId, root, txHash, blockNumber)
            UI shows tx hash + basescan link.

T+next   User clicks "Verify".
            constructs URL: /promptseal-verifier?receipt=<json>&proof=<json>&tx=<hash>
            opens new tab. verify.js reads query params, fills textareas, runs 5 steps.
            GREEN ✓.

T+next   User clicks "Tamper" (defaults to final_decision receipt).
            chain.tamper(receiptId) writes corrupt payload_excerpt to IndexedDB.
            opens verifier with the now-tampered receipt JSON.
            Step 1 fails: event_hash mismatch. RED ✗.

T+next   User clicks "Restore". chain.restore(receiptId). Backup payload restored.
```

State machine: `idle → running → run-complete → anchored ↔ tampered`.

---

## 6. Interface contract (the SDK ↔ client boundary)

This is what PLAN_CLIENT.md mocks against during parallel development.

### Module: `@anuma/sdk/agents/promptseal`

```ts
// useHiringDemo.ts — primary client integration point
export function useHiringDemo(opts: {
  walletPrivateKey: `0x${string}`;     // Base Sepolia EOA
  agentSecretKey: string;               // base64 of raw 32-byte ed25519 seed
  agentTokenId?: number;                // default 633
  rpcUrl?: string;                      // default https://sepolia.base.org
  chainId?: number;                     // default 84532
  registryAddress?: `0x${string}`;      // default 0x7177...d09A
}): {
  // Actions
  run: (resumeId: string) => Promise<void>;
  anchor: () => Promise<{ txHash: `0x${string}`; blockNumber: number }>;
  tamper: (receiptId: number) => Promise<void>;
  restore: (receiptId: number) => Promise<void>;
  reset: () => Promise<void>;

  // State
  state: 'idle' | 'running' | 'run-complete' | 'anchored' | 'error';
  receipts: Receipt[];
  runId: string | null;
  chainOk: boolean | null;
  anchorTx: { txHash: string; blockNumber: number; merkleRoot: string } | null;
  finalDecision: { decision: 'hire' | 'reject'; candidate_id: string; reasoning: string } | null;
  error: string | null;

  // For verifier prefill — returns a URL using the FRAGMENT (#) for params.
  // Fragment is never transmitted to the server, has no practical length
  // limit, keeps receipt JSON client-side. Form: `${baseUrl}/#receipt=...&proof=...&tx=...`
  buildVerifierUrl: (storageId: number, baseUrl: string) => string;
};

export const RESUMES: Array<{
  id: string;
  name: string;
  yoe_react: number;
  yoe_python: number;
  education: string;
  highlights: string;
  expected_decision: 'hire' | 'reject' | 'ambiguous';
}>;
```

### Module: `@anuma/sdk/promptseal`

```ts
// Receipt schema — byte-equal to Python promptseal/receipt.py SCHEMA_VERSION 0.1
// IMPORTANT: this type defines the canonical body. No storage-internal
// fields (e.g. Dexie auto-id) belong here. Canonicalization MUST use a
// whitelist of these fields — never a "everything except event_hash and
// signature" blacklist — to prevent silent breakage on read-back from
// IndexedDB. See PLAN_SDK.md §B3 for the load-bearing detail.
export type Receipt = {
  schema_version: '0.1';
  agent_id: string;
  agent_erc8004_token_id: number | null;
  event_type: 'llm_start' | 'llm_end' | 'tool_start' | 'tool_end'
            | 'final_decision' | 'error';
  timestamp: string;                   // ISO-8601 UTC, ms precision, 'Z' suffix
  parent_hash: string | null;          // 'sha256:<hex>'
  paired_event_hash: string | null;    // 'sha256:<hex>'
  payload_excerpt: Record<string, unknown>;
  public_key: string;                  // 'ed25519:<base64>'
  event_hash: string;                  // 'sha256:<hex>' — derived
  signature: string;                   // 'ed25519:<base64>' — derived
};

export type ReceiptHooks = {
  onLlmStart: (e: LlmStartEvent) => Promise<void>;
  onLlmEnd: (e: LlmEndEvent) => Promise<void>;
  onToolStart: (e: ToolStartEvent) => Promise<void>;
  onToolEnd: (e: ToolEndEvent) => Promise<void>;
};

export function createPromptSealHooks(opts: {
  chain: ReceiptChain;
  agentSecretKey: Uint8Array;          // raw 32-byte
  agentId: string;
  agentTokenId?: number | null;
}): ReceiptHooks;

export class ReceiptChain {
  constructor(dbName?: string);
  openRun(runId: string, agentId: string): Promise<void>;
  append(runId: string, receipt: Receipt): Promise<number>;
  closeRun(runId: string): Promise<void>;
  latestEventHash(runId: string): Promise<string | null>;
  getReceipts(runId: string): Promise<Receipt[]>;
  verifyChain(runId: string): Promise<[true, null] | [false, string]>;
  recordAnchor(runId: string, root: string, txHash: string, blockNumber: number, chainId: number): Promise<void>;
  tamper(receiptId: number, replacement?: string): Promise<void>;
  restore(receiptId: number): Promise<void>;
  observe(runId: string): Observable<Receipt[]>;       // Dexie/RxJS
}

// Pure functions — byte-equal to Python equivalents
export function canonicalJson(obj: unknown): Uint8Array;
export function buildSignedReceipt(opts: BuildOpts): Receipt;
export function verifyReceipt(receipt: Receipt): boolean;
export function buildMerkle(leaves: string[]): { root: string; leaves: string[] };
export function inclusionProof(leaves: string[], index: number): Array<{sibling: string; side: 'L'|'R'}>;
export function verifyProof(leafHex: string, proof: Step[], rootHex: string): boolean;
export async function anchorRoot(opts: AnchorOpts): Promise<AnchorResult>;
export async function readAgentCard(opts: ReadOpts): Promise<{ publicKey: string; agentId: string }>;
```

### Module: `@anuma/sdk` (existing, with new hook-related types)

```ts
// New event types — exported from package roots
export type LlmStartEvent = {
  runId: string;
  stepIndex: number;
  model: string;
  messages: Array<unknown>;
  tools: Array<unknown>;
  requestBody: Record<string, unknown>;
};
export type LlmEndEvent = { runId: string; stepIndex: number; content: string;
  toolCalls: Array<{id; name; arguments}>; usage?: TokenUsage; finishReason?: string;
  error?: string; };
export type ToolStartEvent = { runId: string; stepIndex: number; toolCallId: string;
  name: string; rawArguments: string; parsedArguments?: Record<string, unknown>; };
export type ToolEndEvent = { runId: string; stepIndex: number; toolCallId: string;
  name: string; result?: unknown; error?: string;
  errorType?: 'parse'|'timeout'|'execution'; };
```

---

## 7. Threat model — what's covered, what isn't

What V1 cryptographically proves:
- Receipt body unaltered after signing (`event_hash` recompute).
- Ed25519 signature valid against the public key in the receipt.
- Hash chain unbroken (`parent_hash` links).
- Merkle root anchored on Base Sepolia at a specific block.

What V1 does NOT prove (acknowledge upfront):
- That events not in the chain didn't happen (omission attack — operator
  controls what's emitted).
- That the signed claims correspond to real execution (fabrication —
  operator can sign anything that hashes consistently).

### V1 demo-specific security caveat — client-side signing

The Ed25519 agent secret is delivered to the browser via
`NEXT_PUBLIC_PROMPTSEAL_AGENT_SK` (base64 of the raw 32-byte seed). This is
acceptable for a **testnet integration showcase** but means: anyone who
opens the demo URL can extract the secret from the JavaScript bundle / dev
tools and forge receipts under token #633's identity from any client. This
is a fundamental property of any client-side-signing demo and is the
single largest reason `/promptseal-demo` is not a production deployment
pattern.

What the demo **does** prove (be precise on stage):
- ✅ The SDK's `runToolLoop` hooks fire correctly on every LLM/tool boundary.
- ✅ Receipts produced via TS canonicalization are byte-equal to Python's.
- ✅ The hash chain holds across IndexedDB round-trips.
- ✅ Merkle anchoring on Base Sepolia round-trips end-to-end.
- ✅ The verifier independently validates without trusting any PromptSeal infra.

What the demo **does not** prove:
- ❌ Agent identity is non-forgeable in a hostile environment.
- ❌ Receipts cannot be omitted or fabricated by the operator (V1 across-the-board limitation).

When demoing, lead with: *"this is a testnet integration showcase; production
deployment uses a server-side signing relayer, not a client-bundled key.
V2 closes that gap; today we're proving the integration shape."* Avoids
gotcha-pointing in Q&A.

V2 hardenings (post-demo, additive, don't break verifier):
- Schema signing on `tool_start` / `tool_end` (closes "lie about which
  tool ran" when schemas differ on input or output shape).
- `declared_tool_calls` plaintext in `llm_end` (closes omission of
  tool calls vs the LLM's declared list, given honest LLM response).
- `streamLlm` extraction in SDK (allows nested LLM calls inside tool
  executors to also flow through receipt hooks).

True closure (V3+, requires external witness):
- TEE-attested execution.
- LLM provider co-signing.
- TLS-Notary on LLM calls.

---

## 8. File tree (post-migration)

### anuma-sdk (branch: `promptseal-demo`)

```
src/
├── lib/chat/
│   └── toolLoop.ts                              [MODIFIED — hooks + runId]
├── promptseal/                                  [NEW]
│   ├── canonical.ts
│   ├── crypto.ts
│   ├── receipt.ts
│   ├── chain.ts
│   ├── merkle.ts
│   ├── anchor.ts
│   ├── erc8004.ts
│   ├── hooks.ts
│   ├── verifier/                                [STATIC FILES, copied verbatim
│   │   ├── index.html                            from promptseal repo's verifier/]
│   │   ├── verify.js                             (extended for ?receipt=&proof=&tx= prefill)
│   │   ├── canonical.js
│   │   └── style.css
│   ├── __fixtures__/                            [Python-generated for cross-lang test]
│   └── index.ts
└── agents/promptseal/                           [NEW]
    ├── tools.ts
    ├── prompt.ts
    ├── data/resumes.json                        [verbatim from agent/data/resumes.json]
    ├── useHiringDemo.ts
    └── index.ts
```

### ai-memoryless-client (branch: `promptseal-demo`)

```
apps/web/
├── app/promptseal-demo/                         [NEW]
│   ├── page.tsx
│   ├── HiringDemo.tsx
│   ├── AgentHeader.tsx
│   ├── ResumePicker.tsx
│   ├── ReceiptStream.tsx
│   └── AnchorPanel.tsx
├── components/Home/components/Agents/
│   ├── AgentSelectorModal.tsx                   [MODIFIED — augment agent list]
│   └── agentData.ts                              [MODIFIED — add demo entry]
├── public/promptseal-verifier/                   [COPIED at install via postinstall]
│   ├── index.html
│   ├── verify.js
│   ├── canonical.js
│   └── style.css
└── .env.local                                    [demo wallet + agent SK]
```

---

## 9. Demo wallet

Generated for this migration. Faucet-fund only — no real value at risk.

| Field | Value |
|---|---|
| Address | `0x9718C1CF0C96dde2fb9D820d06785A976972DE2A` |
| Private key | in `.env.demo` (gitignored) |
| Network | Base Sepolia (chain id 84532) |
| Faucet | https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet |

The Ed25519 agent identity remains token #633 on the existing ERC-8004 registry
`0x7177a6867296406881E20d6647232314736Dd09A`. The TS code reuses
`agent_key.pem` (PKCS8 PEM in this repo's root) — read once at build time and
exposed as a base64 env var to the Next.js client.

---

## 10. Out of scope (V2 / post-demo)

- **Dashboard.** The v0.3 dashboard already shipped at `dashboard/` in the
  promptseal repo is a separate, complementary operator-facing UI (split-pane
  runs list, tree view, click-through detail panel, self-contained HTML
  export, evidence-pack drag-drop). The `/promptseal-demo` route in this plan
  is **not** a dashboard replacement — it is a tightly-scoped 5-minute
  integration showcase. If a stakeholder asks "where is the operator UI?"
  → that's the v0.3 dashboard, distinct from the demo route.
- Schema signing
- `streamLlm` extraction (and nested-LLM-in-tool receipts)
- Mobile / Expo parity
- Authentication / Privy gating
- Per-user signing keys
- Backend signing relayer / agent-server
- ZetaChain mainnet / Athens deployment
- LangChain / CrewAI / AutoGen adapters in the SDK
- eIDAS / FRE 902(13) certification PDF generation

## 10a. Demo narrative split (Python ↔ TS)

Both demos sign with the same Ed25519 key bound to ERC-8004 token #633.
This is intentional (key reuse, no re-registration) — but if both demos
are presented to the same audience, lead with this:

| Demo | Highlight | Why this one |
|---|---|---|
| **TS / SDK** (this plan) | Flat call sequence: `llm_start → llm_end → tool_start → tool_end → ...`. **Integration viability** — receipt hooks fit naturally into anuma-sdk's `runToolLoop`. | Proves PromptSeal is portable to the production agent stack. |
| **Python (existing v0.1 demo)** | Nested calls: `tool_start (score_candidate)` parents an inner `llm_start/end` (Haiku) inside the chain. **Hardest cryptographic case** — chain captures arbitrary call nesting. | Proves the schema handles nesting; this is the deepest cryptographic point. |

If both are demoed: TS first (easier mental model + the audience's most
likely production pattern), then Python (the depth-of-capability moment).
Anchors from both demos will interleave under token #633 on Base Sepolia —
clarify in the openings: "same agent identity, two integration paths."

---

## 11. References

- v0.1 Python implementation: this repo (`/Users/tanmay/IdeaProjects/kingpinXD/promptseal`)
- v0.2 plan (dashboard scope, NOT in V1 demo): `PromptSeal-v0.2-PLAN.md`
- Strategy doc (product framing): `PromptSeal-Strategy.md`
- Hackathon context: `PromptSeal-Hackathon.md`
- Existing slide-deck pattern (the architectural template):
  `ai-memoryless-client/apps/web/hooks/useChatSetup.tsx:1492-1770`
- Existing agent picker UI:
  `ai-memoryless-client/apps/web/components/Home/components/Agents/AgentSelectorModal.tsx`
- runToolLoop entry: `anuma-sdk/src/lib/chat/toolLoop.ts:377`
- Live evidence (Base Sepolia):
  - Token #633: https://sepolia.basescan.org/token/0x7177a6867296406881E20d6647232314736Dd09A?a=633
  - Sample anchor: https://sepolia.basescan.org/tx/0xef2052fdbf38becb67660fc106d55e1d533552536d15ce815e4e2e5b8ab017e2
