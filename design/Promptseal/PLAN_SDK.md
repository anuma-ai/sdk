# PLAN: anuma-sdk — PromptSeal demo migration

> **Read `ARCHITECTURE.md` first.** This plan executes one half of the
> migration. The other half (`PLAN_CLIENT.md`) runs in parallel against the
> same interface contract.

## Repo & branch

```bash
cd /Users/tanmay/IdeaProjects/kingpinXD/anuma-sdk
git checkout main && git pull
git checkout -b promptseal-demo
```

## Goal

Land four buckets of work on the `promptseal-demo` branch:

- **A.** Add receipt-shaped hooks to `runToolLoop` (universal, framework-level)
- **B.** New `src/promptseal/` package — TypeScript port of the Python
  `promptseal/` SDK + verifier static files
- **C.** New `src/agents/promptseal/` package — the hiring agent (tools,
  prompt, resumes, `useHiringDemo` hook)
- **D.** Cross-language byte-equality fixture corpus + tests

No upstream PR. All work stays branch-local. The client repo links to this
branch via `pnpm link` for the demo.

## Setup

```bash
pnpm install
pnpm test                                    # confirm baseline green
```

Install new deps for buckets B–C:

```bash
pnpm add @noble/ed25519@^2.1.0 viem@^2.21.0 dexie@^4.0.10
pnpm add -D vitest-fetch-mock@^0.3.0         # for anchor.ts tests
```

## Reference reading (do this before coding)

- [`./ARCHITECTURE.md`](./ARCHITECTURE.md) — canonical spec, especially
  §6 (interface contract) and §7 (threat model)
- Python source of truth at `kingpinXD/promptseal/promptseal/*.py`
  (sibling repo). The TS port is byte-equal at the canonical-JSON layer.
- Original verifier at `kingpinXD/promptseal/verifier/{verify.js,canonical.js}`.
  Copied verbatim into `src/promptseal/verifier/`.
- `kingpinXD/promptseal/PromptSeal-CLAUDE-CODE-BRIEF.md` §5 (receipt
  schema), §10 (ERC-8004), §13 (canonicalization pitfalls)
- This repo's `src/lib/chat/toolLoop.ts:377` — `runToolLoop` entry point
- This repo's `src/lib/chat/useChat/utils.ts:632` — `executeToolCall`
- This repo's `src/lib/chat/useChat/types.ts:72-120` — `ToolConfig` shape
- This repo's existing slide-tools impl (for layout precedent):
  `src/lib/chat/tools/...` (find via `grep -rn "buildSlideSystemPrompt"`)

## Acceptance criteria

The branch is ready to ship when:

1. `pnpm test` green, including new bucket A/B/C/D tests.
2. `pnpm typecheck` clean.
3. A standalone integration test (`bucket C, TODO C5`) runs the hiring agent
   end-to-end against a stub `transport`, emits ~14 receipts, `verifyChain`
   returns `[true, null]`, the Merkle root computes deterministically.
4. Cross-language fixture test: every Python-generated fixture in
   `src/promptseal/__fixtures__/` passes `verifyReceipt(...)` in TS.
5. The demo wallet anchor flow (manual smoke test against Base Sepolia)
   sends a real TX with the root in the data field. Document the TX hash
   in a PR comment / branch note.

---

## Bucket A — runToolLoop hooks

**Purpose:** add four optional callbacks + a `runId` to `runToolLoop` so
consumers (PromptSeal, future telemetry/tracing) can attach observers at
LLM and tool boundaries. Generic names — not PromptSeal-specific.

### A1. Generate `runId` UUID inside `runToolLoop`

- **File:** `src/lib/chat/toolLoop.ts:377`
- **What:** at the top of the `runToolLoop` function body, generate
  `const runId = crypto.randomUUID();` (or use `nanoid` if already a dep).
- **Plumb through:** thread `runId` into every event passed to the new hooks
  (A2, A3) and to existing `onStepFinish` if non-breaking.

**Verify:** `unit test in src/lib/chat/__tests__/toolLoop.receipts.test.ts` —
single invocation, capture all event objects, assert every event carries the
same `runId` value.

### A2. Add `onLlmStart` / `onLlmEnd` hooks

- **File:** `src/lib/chat/toolLoop.ts`
- **Wire-in points:**
  - `onLlmStart` fires immediately before the SSE iteration begins
    (currently around line 511, just before `for await (const chunk of sseResult.stream)`)
  - `onLlmEnd` fires after stream completes, before the termination check
    (around line 598)
- **Event shape:** see `ARCHITECTURE.md` §6 (`LlmStartEvent`, `LlmEndEvent`)
- **Error path:** if the stream fails or the response has an error,
  fire `onLlmEnd` with `error` populated. Do not skip the hook on error.

**Verify:** stub `transport` to return controllable chunks. Drive 3 rounds
(2 with tool calls, 1 ending in text). Assert exactly 3 `(start, end)`
pairs with correct `stepIndex`, `model`, `requestBody`, `content`,
`toolCalls`, `usage`. Inject a stream error mid-round; assert `onLlmEnd`
still fires with `error` set.

### A3. Add `onToolStart` / `onToolEnd` hooks

- **File:** `src/lib/chat/useChat/utils.ts:632` (`executeToolCall`)
- **What:** wrap the executor invocation. Fire `onToolStart` before parsing
  args / executing; fire `onToolEnd` after, regardless of outcome.
- **Important:** unlike the existing `onToolCall` (which only fires for
  tools without an executor), these new hooks fire for **every** tool call.
  Existing `onToolCall` stays unchanged for backward compatibility.
- **Error paths:** parse error, timeout (`ToolTimeoutError`), execution
  exception — all three must fire `onToolEnd` with `errorType` set
  appropriately (`'parse'` / `'timeout'` / `'execution'`).

**Verify:** four sub-tests covering the four outcomes (success, parse,
timeout, exception). Each must show `onToolStart` and `onToolEnd` fire
exactly once with correct `name`, `toolCallId`, `runId`, `stepIndex`,
and the right `errorType` on failures.

### A4. Type exports

- **File:** `src/index.ts` and `src/{server,react,expo}/index.ts`
- **What:** export `LlmStartEvent`, `LlmEndEvent`, `ToolStartEvent`,
  `ToolEndEvent`, plus update `RunToolLoopOptions` interface to include the
  four new optional hooks.

**Verify:** in a downstream test file, `import type { LlmStartEvent } from '@anuma/sdk'`
resolves and provides the expected shape.

### A5. Test coverage

- **New file:** `src/lib/chat/__tests__/toolLoop.receipts.test.ts`
- **Coverage target:** > 90% on the new hook code paths.
- **Existing tests:** must remain green unchanged.

---

## Bucket B — `src/promptseal/` framework package

**Purpose:** TS port of the Python `promptseal/` SDK. Byte-equal canonical
JSON. Same receipt schema. IndexedDB storage for the chain. viem for anchor
+ ERC-8004 read.

### B1. `canonical.ts` — canonical JSON serialization

- **Source of truth (Python):** `promptseal/canonical.py`
- **Reference (existing JS):** `verifier/canonical.js` (already byte-equal
  to Python — port to TS preserving semantics)
- **Critical rules:**
  - sorted keys recursively
  - `JSON.stringify`-equivalent with no whitespace
  - UTF-8 bytes (use `TextEncoder`)
  - **must preserve number tokens** (the Python parser preserves `0.0` as
    `"0.0"`; `JSON.parse + JSON.stringify` collapses to `"0"` and breaks
    signature verification — see `verifier/canonical.js` for the existing
    workaround)

**Verify:** new fixture corpus from Python (`src/promptseal/__fixtures__/canonical_corpus.json`)
— 50+ inputs with expected canonical bytes. TS implementation must match
byte-for-byte.

### B2. `crypto.ts` — Ed25519 keypair, sign, verify

- **Source of truth (Python):** `promptseal/crypto.py`
- **Implementation:** `@noble/ed25519` v2.1.0
- **API:**
  ```ts
  export function generateKeypair(): { sk: Uint8Array; pk: Uint8Array };
  export function publicKeyBytes(sk: Uint8Array): Uint8Array;  // raw 32-byte
  export function sign(sk: Uint8Array, msg: Uint8Array): Promise<Uint8Array>;  // 64-byte
  export function verify(pk: Uint8Array, msg: Uint8Array, sig: Uint8Array): Promise<boolean>;
  export function loadAgentKeyFromPem(pem: string): Uint8Array;  // PKCS8 PEM → 32-byte secret
  ```

**Verify:** round-trip test (sign → verify true). Cross-test: sign a known
message in Python, paste sig hex into TS test, `verify(...)` returns true.

### B3. `receipt.ts` — build/verify

- **Source of truth (Python):** `promptseal/receipt.py`
- **Schema version:** `'0.1'` (mirror Python exactly)
- **API:**
  ```ts
  export const SCHEMA_VERSION = '0.1';
  export const HASH_PREFIX = 'sha256:';
  export const KEY_PREFIX = 'ed25519:';

  // Canonical field whitelist — the ONLY fields that go into canonical bytes.
  // Critical: do NOT use a blacklist (e.g. "everything except event_hash and
  // signature") because Dexie / IndexedDB round-trips can introduce extra
  // storage-side fields (auto-incremented `id`) that would silently fold into
  // the hash and break verification on the read path. See Charlie's review,
  // Engineering risk #1.
  export const CANONICAL_FIELDS = [
    'agent_erc8004_token_id',
    'agent_id',
    'event_type',
    'paired_event_hash',
    'parent_hash',
    'payload_excerpt',
    'public_key',
    'schema_version',
    'timestamp',
  ] as const;

  export async function buildSignedReceipt(opts: {
    sk: Uint8Array;
    agentId: string;
    agentErc8004TokenId: number | null;
    eventType: string;
    payloadExcerpt: Record<string, unknown>;
    parentHash: string | null;
    pairedEventHash?: string | null;
    timestamp?: string;
  }): Promise<Receipt>;

  export async function verifyReceipt(r: Receipt): Promise<boolean>;
  export function receiptBodyBytes(r: Receipt): Uint8Array;
  ```
- **Pipeline (mirror Python exactly):**
  1. Build body **using the whitelist above** — pick exactly those nine
     fields, in any object-key order (canonicalization will sort them).
  2. canonical bytes via `canonical.ts`
  3. `event_hash = "sha256:" + sha256(bytes).hex()`
  4. `signature = "ed25519:" + base64(ed25519.sign(bytes))`
  5. Add `event_hash` and `signature` to the body, return.
- **`receiptBodyBytes(r)` implementation:** must build the body via the
  whitelist (`pick(r, CANONICAL_FIELDS)`), not by deletion of known
  derived fields. This is the load-bearing detail.

**Verify:**
- Build a receipt in TS, hash matches Python's hash for the same body.
- Tamper one byte → `verifyReceipt` returns false.
- Bidirectional fixture cross-check.
- **Round-trip safety test (load-bearing):** sign a receipt → store via
  `chain.append` → read back via `chain.getReceipts` → `verifyReceipt`
  on each retrieved object → all return `true`. Add fields like
  `__dexie_internal: 'foo'` to the retrieved object and confirm
  `verifyReceipt` still returns `true` (because the whitelist ignores
  the extra field). This is the single most likely silent-break of the
  v1 demo.

### B4. `chain.ts` — IndexedDB hash-chain

- **Source of truth (Python):** `promptseal/chain.py`
- **Storage:** Dexie 4.x. Three tables: `runs`, `receipts`, `anchors`,
  matching the Python SQL schema fields. Dexie's auto-incremented `++id`
  primary key on the `receipts` table is **storage-internal** — it is
  used as the lookup key for tamper/restore (UI affordance) but is
  never included in the canonical receipt body.
- **`getReceipts(runId): Promise<Receipt[]>`** must return clean canonical
  Receipt objects (matching the type in `ARCHITECTURE.md` §6) — strip
  any Dexie-internal fields. The `Receipt` type has exactly the nine
  canonical fields plus `event_hash` and `signature`. Nothing else.
- **`listReceiptRecords(runId): Promise<Array<{ storageId: number; receipt: Receipt }>>`**
  is a separate API for the UI: returns receipts paired with their Dexie
  storage IDs, so the tamper button can address rows by id without
  exposing Dexie internals to the canonicalization path.
- **API:** see `ARCHITECTURE.md` §6 `ReceiptChain` class.
- **Append semantics (must match Python):**
  - validate `parent_hash` equals `latestEventHash(runId)`
  - `verifyReceipt` must return true before insert (uses the whitelist
    from B3 — does not depend on Dexie's row layout)
  - throw `ChainIntegrityError` on either failure
- **Tamper / restore methods:**
  - `tamper(storageId: number, replacement = '{"i":99}')` — mutate
    `payload_excerpt` column for the row with that Dexie id, save the
    original payload to a `tampered_backups` Dexie table keyed by storageId.
  - `restore(storageId: number)` — write back from backup, delete backup row.
- **observe(runId):** returns a Dexie `liveQuery` observable that ReceiptStream.tsx
  subscribes to via `dexie-react-hooks#useLiveQuery`. Emits `Receipt[]` (no
  storage IDs); the UI uses `listReceiptRecords` separately for tamper.

**Verify:**
- Insert 14 receipts in order. `verifyChain` returns `[true, null]`.
- Tamper a row → `verifyChain` returns `[false, "<reason>"]`. Restore → green.
- **Round-trip safety:** `append → getReceipts → verifyReceipt` on every
  returned object returns `true`. (Tests B3's whitelist invariant from the
  storage side.)
- `listReceiptRecords` returns the same set as `getReceipts` plus the
  storage IDs; the embedded receipt objects are byte-identical to
  what `getReceipts` returns.

### B5. `merkle.ts` — tree + inclusion proofs

- **Source of truth (Python):** `promptseal/merkle.py`
- **Conventions (mirror exactly):** Bitcoin-style; duplicate-last-on-odd;
  single-leaf root = leaf; proof steps are `{sibling: 'sha256:<hex>', side: 'L'|'R'}`.
- **API:** see `ARCHITECTURE.md` §6.

**Verify:** same fixture leaves produce same root + same per-index proofs
as Python.

### B6. `anchor.ts` — viem self-send TX

- **Source of truth (Python):** `promptseal/anchor.py`
- **Implementation:** viem `walletClient.sendTransaction` with
  `to: account.address, value: 0n, data: <0x-prefixed 32-byte root>`,
  EIP-1559 fees.
- **API:**
  ```ts
  export async function anchorRoot(opts: {
    rootHex: string;                     // 'sha256:<hex>' or '<hex>'
    rpcUrl: string;
    chainId: number;
    privateKey: `0x${string}`;
    confirmTimeout?: number;
  }): Promise<{
    txHash: `0x${string}`;
    blockNumber: number;
    merkleRoot: string;
    chainId: number;
    sender: `0x${string}`;
    gasUsed: number;
  }>;
  ```

**Verify:** mock viem with `vitest-fetch-mock`; assert tx submission carries
correct `data` field and `to == from`. Live smoke test: anchor a 5-receipt
run on Base Sepolia from the demo wallet, confirm via `eth_getTransactionByHash`.

### B7. `erc8004.ts` — read-only token lookup

- **Source of truth (Python):** `promptseal/erc8004.py`
- **API (read-only for hackathon, write side optional):**
  ```ts
  export async function readAgentCard(opts: {
    rpcUrl: string;
    registryAddress: `0x${string}`;
    txHash: `0x${string}`;            // the original register() tx
  }): Promise<{ publicKey: string; agentId: string }>;
  ```
- **Implementation:** viem's `getTransactionReceipt`, scan logs for the
  custom event topic
  `0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a`,
  decode the `data` field as `(string)` ABI.

**Verify:** point at the existing token #633 register tx (see
`agent_id.json` in the promptseal repo). Recover the data URI. Decode.
Confirm pubkey matches `agent_key.pem`'s public bytes.

### B8. `hooks.ts` — `createPromptSealHooks`

- **Source of truth (Python):** `promptseal/handler.py`
- **API:**
  ```ts
  export function createPromptSealHooks(opts: {
    chain: ReceiptChain;
    sk: Uint8Array;
    agentId: string;
    agentTokenId?: number | null;
  }): ReceiptHooks;
  ```
- **Pairing logic (mirror Python `handler.py:_pending_starts`):**
  - keep an in-memory `Map<string, string>` for pending event_hashes
  - LLM key: `${runId}:llm:${stepIndex}`
  - Tool key: `${runId}:tool:${toolCallId}`
- **Special: `final_decision`:** when `onToolEnd` fires with
  `name === 'decide'`, parse the result, if it's a valid hire/reject dict
  emit a *second* receipt with `event_type: 'final_decision'` and the
  decision payload. Mirrors `handler.py:319-322`.
- **runId → PromptSeal run_id mapping:** simply use the SDK's `runId` as the
  PromptSeal run_id. No translation layer needed.

**Verify:** drive each hook with synthetic events; assert chain contains
the expected receipt sequence with correct `paired_event_hash` links and
the extra `final_decision` after `decide` ends.

### B9. `verifier/` static files

- **Source:** `/Users/tanmay/IdeaProjects/kingpinXD/promptseal/verifier/{index.html,verify.js,canonical.js,style.css}`
- **Action:** copy verbatim into `src/promptseal/verifier/`
- **One modification:** extend `verify.js` to read **URL fragment**
  parameters on load and prefill the textareas:
  ```js
  // Use location.hash, NOT location.search — receipt JSON can be ~1-3 KB
  // and a future v2 schema with embedded LLM messages could push past the
  // ~8 KB practical query-string ceiling. The fragment never leaves the
  // client (not transmitted to the server), has no length limit beyond
  // browser memory, and works identically for our prefill needs.
  // See Charlie's review, Engineering risk #2.
  const fragment = location.hash.slice(1);  // strip leading '#'
  const params = new URLSearchParams(fragment);
  if (params.has('receipt')) document.getElementById('in-receipt').value = params.get('receipt');
  if (params.has('proof'))   document.getElementById('in-proof').value   = params.get('proof');
  if (params.has('tx'))      document.getElementById('in-tx').value      = params.get('tx');
  ```
- **Build packaging — must publish verifier files in the SDK artifact:**
  - The verifier directory must be in the published `dist/` and listed
    in `package.json#files`. Without this, the client's postinstall
    copy step fails silently. See Charlie's review, Engineering risk #3.
  - Add to `package.json`:
    ```json
    {
      "files": [
        "dist/**",
        "dist/promptseal/verifier/**"
      ],
      "scripts": {
        "build:verifier": "mkdir -p dist/promptseal/verifier && cp src/promptseal/verifier/*.{html,js,css} dist/promptseal/verifier/",
        "build": "<existing build> && pnpm build:verifier"
      }
    }
    ```
  - Add a smoke test in CI / pre-publish hook: build the SDK, then assert
    `dist/promptseal/verifier/{index.html,verify.js,canonical.js,style.css}`
    all exist. Fail the build if any are missing.

**Verify:**
- Open the file directly via `file://` in a browser, paste a sample
  receipt, GREEN ✓.
- Open with fragment `#receipt=...&proof=...&tx=...` and confirm
  autoload + click Verify → GREEN ✓.
- Run `pnpm build`. Assert the four verifier files land in
  `dist/promptseal/verifier/` (a small Node test or shell check is enough).
- From a clean directory: `npm pack` the SDK, extract the tarball, confirm
  the verifier files are inside. Catches a missing `package.json#files`
  entry before the client postinstall fails.

### B10. `index.ts` — public exports

Export everything documented in `ARCHITECTURE.md` §6 (`@anuma/sdk/promptseal`
section).

---

## Bucket C — `src/agents/promptseal/` hiring agent

### C1. `data/resumes.json`

Copy verbatim from `/Users/tanmay/IdeaProjects/kingpinXD/promptseal/agent/data/resumes.json`.

**Verify:** `diff` produces no output.

### C2. `prompt.ts` — system prompt builder

- **Source of truth (Python):** `agent/hiring_agent.py:21-31`
- **API:** `export function buildHiringSystemPrompt(): string`
- Verbatim prose.

### C3. `tools.ts` — three tool configs

- **Source of truth (Python):** `agent/tools.py`
- **API:** `export function createHiringTools(): ToolConfig[]`
- **Three tools:**
  1. **`resume_parse(resume_id: string)`** — read from bundled JSON,
     strip `expected_decision`, return resume dict. Direct port of
     `tools.py:31-43`.
  2. **`score_candidate(name, yoe_react, yoe_python, education, highlights)`** —
     **synthetic scoring (NO inner LLM call — D2)**. Deterministic rule:
     ```ts
     const technical = Math.min(10, Math.max(1, Math.floor((yoe_react + yoe_python) * 0.7) + 1));
     const culture = /Stanford|MIT|FAANG|unicorn/i.test(education + highlights) ? 8 : 5;
     const ambiguity = (yoe_react > 0 && yoe_python > 0 && yoe_react + yoe_python > 5) ? 3 : 7;
     return { technical_score: technical, culture_score: culture, ambiguity_score: ambiguity };
     ```
     Tune to produce hire/reject outcomes that match the `expected_decision`
     in the resumes for predictable demos.
  3. **`decide(technical_score, culture_score, ambiguity_score, candidate_id)`** —
     pure rule logic, byte-for-byte from `tools.py:108-127`.

### C4. `useHiringDemo.ts` — primary client integration hook

- **API:** see `ARCHITECTURE.md` §6 (full signature)
- **Internals:**
  - Decode `agentSecretKey` (base64) → `Uint8Array`
  - Construct `ReceiptChain` (IndexedDB)
  - Construct `createPromptSealHooks({ chain, sk, agentId, agentTokenId })`
  - `run(resumeId)`:
    - generate `runId` (or let `runToolLoop` generate; capture from result)
    - call `useChatSubmitHandler` (or directly `runToolLoop`) with hiring
      tools + system prompt + hooks
    - subscribe to chain observable; update local `receipts` state
  - `anchor()`:
    - `buildMerkle(receipts.map(r => r.event_hash))` → root
    - `anchorRoot({ rootHex: root, rpcUrl, chainId, privateKey: walletPrivateKey })`
    - `chain.recordAnchor(...)`; update local `anchorTx` state
  - `tamper(id) / restore(id)`:
    - delegate to `chain.tamper / restore`
  - `buildVerifierUrl(receiptId, baseUrl)`:
    - fetch the receipt, get its inclusion proof, get the anchor tx hash,
      url-encode all three, return string

**Verify:** standalone vitest integration test using a stubbed `transport`
that returns canned tool-use chunks. Run end-to-end: `useHiringDemo.run`
emits ~14 receipts, `chainOk === true`, `finalDecision` populated. Then
`anchor()` (mocked viem) returns a tx hash, `anchorTx` populated. Then
`tamper(finalDecisionId)` → `chainOk === false`.

### C5. `index.ts` — exports

Export everything documented in `ARCHITECTURE.md` §6 (`@anuma/sdk/agents/promptseal`).

---

## Bucket D — Cross-language fixture corpus

### D1. Generate fixtures from Python

Run a small Python script (in the promptseal repo) that generates:
- `canonical_corpus.json` — 50 input objects + their canonical bytes (hex)
- `receipt_corpus.json` — 20 signed receipts the TS verifier must accept
- `merkle_corpus.json` — 10 leaf-set + root + per-index proofs

Place under `anuma-sdk/src/promptseal/__fixtures__/`.

### D2. TS test that consumes them

For each fixture: TS must produce identical canonical bytes / verify each
receipt / produce identical Merkle root + proofs.

**Verify:** `pnpm vitest run src/promptseal/__tests__/cross_lang.test.ts`
green.

---

## What NOT to do (scope guards)

- ❌ Do not refactor `runToolLoop` to extract `streamLlm`. That is V2.
- ❌ Do not implement `score_candidate` with a real LLM call. Synthetic
  scoring only (D2 in ARCHITECTURE.md).
- ❌ Do not add schema signing to receipts. V2.
- ❌ Do not change the existing `onToolCall` / `onStepFinish` callbacks.
  New hooks are additive.
- ❌ Do not bump LangChain or any unrelated dep.
- ❌ Do not write to the upstream `anuma-sdk` main branch. Branch only.
- ❌ Do not add an external dashboard / tree view UI. The client owns demo UX.

## Suggested order

1. Bucket B in parallel: B1 (canonical), B2 (crypto), B5 (merkle) first —
   these are pure functions, no SDK dependency. B3 (receipt) next, with
   the **whitelist invariant + round-trip Dexie test landed alongside B4
   on the same critical path** — otherwise any silent break would only
   surface at the user-visible "verify the chain after run completes"
   step. B6 (anchor), B7 (erc8004), B8 (hooks) last.
2. Bucket A after B is roughly halfway done — needs B's hook contract type
   names but not implementations.
3. Bucket C after A and B8 land.
4. Bucket D continuously — generate fixtures from Python early, test
   against them as each TS module lands.

## When done

- Push branch to remote (do not merge): `git push -u origin promptseal-demo`
  — actually no, **per ARCHITECTURE D in scope**, work stays local. `pnpm
  link` against this directory from the client repo. Skip remote.
- Notify the client-side agent that the SDK branch is ready for `pnpm link`.
- Document any SDK API divergences from the architecture spec in a
  `BRANCH_NOTES.md` at the SDK repo root.
