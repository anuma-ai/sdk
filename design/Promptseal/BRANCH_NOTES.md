# BRANCH_NOTES — `promptseal-demo`

Branch-local work for the PromptSeal v0.3 SDK migration. **Do not push to
remote.** Hackathon scope; merges happen post-demo.

## Live anchor smoke tests (Base Sepolia)

| When | Sender | Block | Tx |
|---|---|---|---|
| 2026-05-06 | `0x9718C1CF0C96dde2fb9D820d06785A976972DE2A` | 41168426 | [`0x6920513f...331b9c5fc`](https://sepolia.basescan.org/tx/0x6920513f590679f0cd93b65f4dd456e1fcb30143026dbb1041ce649331b9c5fc) |

The smoke run signed 5 deterministic receipts with a fresh Ed25519 key,
built a Merkle root, and self-sent a Base Sepolia tx with the root in
`data`. Reproduce via:

```bash
set -a; source /Users/tanmay/IdeaProjects/kingpinXD/promptseal/.env.demo; set +a
node scripts/promptseal-smoke-anchor.mjs
```

The demo wallet had ~0.005 ETH at the time of the smoke run; refill via the
[Coinbase Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
if it dips below ~0.001 ETH.

## What landed

### Bucket A — `runToolLoop` receipt-shaped hooks

- `src/lib/chat/receiptHooks.ts` — `LlmStartEvent`, `LlmEndEvent`,
  `ToolStartEvent`, `ToolEndEvent`, `ReceiptHooks` types. Generic names; not
  PromptSeal-specific.
- `src/lib/chat/toolLoop.ts` — `RunToolLoopOptions` accepts `runId` (caller
  override; otherwise `crypto.randomUUID()`) and the four optional hooks.
  Hooks fire on every LLM round (initial + each continuation), and on every
  tool call (executor or onToolCall path; for executor-less tools only
  `onToolStart` fires, no `onToolEnd`).
- All four error paths covered: parse, timeout, execution exception,
  blocked-by-failed-deps cycle. Stream errors fire `onLlmEnd` with `error`
  populated.
- Type re-exports added to `src/server/index.ts` and `src/react/index.ts`.
  (`expo` left untouched — Expo doesn't currently re-export `runToolLoop`
  types; not in scope.)
- Test: `src/lib/chat/__tests__/toolLoop.receipts.test.ts` (8 tests).

### Bucket B — `src/promptseal/` framework

- `canonical.ts` — sorted-keys, no-whitespace, UTF-8 canonical JSON.
  `parseJsonPreservingNumbers` + `NumberToken` keep `0.0` from collapsing
  to `0` when round-tripping JSON text, which is the load-bearing detail
  for cross-language byte parity.
- `crypto.ts` — `@noble/ed25519` v2.3 wrapper. **Adjusted from v2.1 in the
  plan** because the API was renamed: `utils.randomSecretKey` →
  `utils.randomPrivateKey`. Behavior identical.
- `receipt.ts` — `CANONICAL_FIELDS` whitelist (the nine fields, in
  alphabetical order). `receiptBodyBytes` picks via the whitelist, never
  via deletion. The whitelist invariant is round-trip-tested in
  `chain.test.ts` ("ignores extra non-canonical fields on read-back" +
  "round-trip: append → getReceipts → verifyReceipt").
- `chain.ts` — Dexie 4.x. Four tables: `runs`, `receipts`,
  `anchors`, `tampered_backups`. `getReceipts` strips Dexie's auto-id;
  `listReceiptRecords` exposes it for the UI's tamper button.
- `merkle.ts` — Bitcoin-style. Single-leaf root = leaf. Duplicate-last on
  odd. Cross-tested against Python fixtures (10 trees, 70 proofs).
- `anchor.ts` — viem self-send tx. Default chain is Base Sepolia, but accepts
  any chainId + RPC. EIP-1559 fees are handled by viem.
- `erc8004.ts` — read-only `readAgentCard` decodes the registry's custom
  event (topic `0xca52e62c...`) for the agent card URI; no write side
  needed for the demo (token #633 is already registered).
- `hooks.ts` — `createPromptSealHooks` adapts the SDK's universal events
  into signed-receipt emissions. Pairing keys: `${runId}:llm:${stepIndex}`
  and `${runId}:tool:${toolCallId}`. Special: `decide` tool result emits
  an extra `final_decision` receipt.
- `verifier/` — `index.html`, `verify.js`, `canonical.js`, `style.css`
  copied verbatim from the promptseal repo. `index.html` extended with
  fragment-based prefill (`location.hash`, NOT `location.search`).
- `__fixtures__/` — generated from Python via
  `scripts/promptseal-generate-fixtures.py`. 30 canonical-JSON cases,
  10 chained signed receipts, 10 Merkle trees. Cross-language test
  validates byte equality at every layer (61 assertions).

### Bucket C — `src/agents/promptseal/` hiring agent

- `data/resumes.json` — verbatim copy from `agent/data/resumes.json`,
  diff-clean.
- `prompt.ts` — `buildHiringSystemPrompt()`, verbatim from Python.
- `tools.ts` — `createHiringTools()` returns three `ToolConfig`s. As
  per **decision D2 in `ARCHITECTURE.md`**, `score_candidate` uses
  synthetic deterministic scoring (no inner LLM call). The formula is
  tuned so the hardcoded `expected_decision` for each resume matches what
  `decide()` returns. `decide` is byte-equal to `agent/tools.py:108-127`.
- `useHiringDemo.ts` — React hook. Wires hooks → chain → `runToolLoop`,
  exposes `run / anchor / tamper / restore / reset`, plus
  `buildVerifierUrl(storageId, baseUrl)` which uses the URL **fragment**
  (not query string) so receipts can be 1-3 KB without hitting the 8 KB
  query-string ceiling.

### Bucket D — Cross-language fixtures

- `scripts/promptseal-generate-fixtures.py` regenerates fixtures from the
  Python reference repo. Run before retesting after any Python schema
  change.
- `src/promptseal/__tests__/cross_lang.test.ts` consumes them. 61 tests.

## Test summary

```
Test Files  59 passed | 1 skipped (60)
     Tests  939 passed | 3 skipped (942)
  Duration  ~28s
```

Baseline before this branch: 835 passed (3 skipped). New tests: 104.

```
pnpm typecheck  → clean
pnpm build      → ✓ (dist/promptseal/, dist/agents/promptseal/, verifier files copied)
npm pack --dry-run → confirms verifier files inside the published tarball
```

## Deviations from the plan

1. **`@noble/ed25519` v2.3 instead of v2.1.0.** Plan specified v2.1.0 but
   pnpm resolved 2.3. The API renamed `utils.randomSecretKey` →
   `utils.randomPrivateKey`; otherwise identical. No behavior impact.
2. **`fake-indexeddb` added as a dev dep.** Wasn't in the plan but is
   needed to exercise Dexie under happy-dom in vitest. Self-contained,
   no runtime impact.
3. **`onLlmStart`/`onLlmEnd` fire `stepIndex` 0 for the initial round.**
   Plan said the same; flagging because the existing `onStepFinish`
   numbers from 1 (it skips the initial pre-tool round). The two indexing
   schemes coexist; no shared variable.
4. **For executor-less tool calls (server-side tools), only `onToolStart`
   fires — there's no `onToolEnd`.** This is consistent with the plan's
   "every tool call" requirement, but documented here because the
   asymmetry differs from auto-executed tools.
5. **`useHiringDemo` is a real React hook** (uses `useState/useEffect/useMemo`)
   rather than a non-React-shape factory. The plan's interface contract
   showed React-shape return values; this matched the contract while
   keeping setup cleanly typed in the consumer. Tests use `renderHook` from
   `@testing-library/react`.
6. **`extractDecision` returns the raw reasoning string** in
   `hooks.ts`; the surrounding `emit(...)` hashes it via `hashUtf8`
   before placing it in `reasoning_hash`. Equivalent to Python's
   `_hash_str(str(output.get("reasoning", "")))` but with the hashing
   one call layer removed. Documenting the layout because it's mildly
   confusing on first read.

## Items requiring human review

- **Live anchor on the demo wallet.** Done once for smoke (tx
  `0x6920513f...`). For the actual presentation, run a longer chain
  (~14 receipts) end-to-end through `useHiringDemo.run() → .anchor()`
  on the integration page; the smoke script just exercises `anchor.ts`
  directly.
- **ERC-8004 register tx for the existing token #633.** `readAgentCard`
  needs the original register tx hash (stored in `agent_id.json` in the
  promptseal repo). The .env.demo wasn't readable from the harness, but
  the address (`0x9718C1CF0C96dde2fb9D820d06785A976972DE2A`) is known and
  the token (#633) is on `0x7177a6867296406881E20d6647232314736Dd09A`.
  The client will need both the token id and register tx hash to
  populate the AgentHeader basescan link.
- **Client-side import path.** `useHiringDemo` lives at
  `@anuma/sdk/agents/promptseal`. The new export was added to
  `package.json#exports` and to `tsup.config.ts`. The client repo's
  `pnpm link ../anuma-sdk` should resolve it; verify on first integration.
- **`pnpm link` interaction with React's `<Provider>` boundaries.** The
  hook calls `useState/useEffect/useMemo` from `react`, declared as a
  peer dep. If two React copies end up resolved (one from the SDK's
  bundle and one from the client), hook state will desync. The integration
  step should pin React via the consumer's resolver — known anuma-sdk
  practice but worth re-verifying for this hook specifically.
- **Real-world LLM model selection.** The `useHiringDemo` default is
  `claude-sonnet-4-6`. If the demo runs Haiku for parity with Python,
  pass `model: "claude-haiku-4-5"` from the client.

## How to run locally

```bash
cd /Users/tanmay/IdeaProjects/kingpinXD/anuma-sdk
git checkout promptseal-demo
pnpm install
pnpm test                                    # 939 tests green
pnpm typecheck                               # clean
pnpm build                                   # → dist/promptseal/, dist/agents/promptseal/
ls dist/promptseal/verifier/                 # smoke check the four files

# Optional — regenerate cross-lang fixtures from Python:
/Users/tanmay/IdeaProjects/kingpinXD/promptseal/.venv/bin/python3 \
  scripts/promptseal-generate-fixtures.py

# Optional — re-run the live anchor smoke:
bash -c 'set -a; source /Users/tanmay/IdeaProjects/kingpinXD/promptseal/.env.demo; set +a; \
         node scripts/promptseal-smoke-anchor.mjs'
```
