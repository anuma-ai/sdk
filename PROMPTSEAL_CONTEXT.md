# PromptSeal — context

Cross-repo demo proving that an AI agent's chain-of-thought can be
cryptographically receipted, hash-chained, Merkle-anchored to a public
blockchain, and re-verified by anyone using only static HTML.

> This document spans both `@anuma-ai/sdk` (this repo) and
> `zeta-chain/ai-memoryless-client` (the chat UI consuming this SDK).
> Both ship their work on branch `promptseal-demo`.

## What's being proved

- Every LLM call and tool call inside `runToolLoop` is witnessed via
  optional lifecycle hooks (`onLlmStart`, `onLlmEnd`, `onToolStart`,
  `onToolEnd`).
- Each receipt is signed with an Ed25519 key whose public half is
  registered in ERC-8004 token #634 on Base Sepolia.
- Receipts form a hash-chain (`parent_hash` → `event_hash`), validated
  on every insert. Tampering a single receipt breaks chain integrity.
- A Merkle root over the run's `event_hash` list is anchored on
  Base Sepolia in `tx.input` (32 bytes, self-send tx).
- A third party with `{receipt, proof, tx_hash}` can re-verify the
  receipt offline against any public Base Sepolia RPC. No SDK, no
  Anuma portal, no Privy required at verify time.

## Repo split

| Repo | Branch | Owns |
|---|---|---|
| `anuma-ai/sdk` | `promptseal-demo` | Receipt primitives (canonical JSON, Ed25519 sign/verify, Merkle, hash-chain, anchor tx via viem), `useHiringDemo` standalone hook, lifecycle hooks added to `runToolLoop`/`useChat`/`useChatStorage`, the static verifier (`dist/promptseal/verifier/`). Hash-chain storage in IndexedDB via Dexie. |
| `zeta-chain/ai-memoryless-client` | `promptseal-demo` | Chat-integrated demo: `usePromptSealHooks` glue, `PromptSealReceiptPanel` side panel, `AgentSelectorModal` entry, `/promptseal-demo` standalone QA route, locale strings, postinstall step that mirrors verifier from SDK into `apps/web/public/promptseal-verifier/`, CSP entry for `sepolia.base.org`. |

Pinned via `link:` in the client's `apps/web/package.json` so SDK changes
land instantly during dev. Build the SDK after edits (`pnpm build`) so
`dist/` reflects the change — the client imports from `@anuma/sdk/promptseal`
which resolves through `dist/`, not `src/`.

## Data flow (per agent run)

1. **Agent selection** — User picks "Hiring screen (PromptSeal)" in
   `AgentSelectorModal`. `usePromptSealHooks` activates and produces a
   `ReceiptHooks` bundle.
2. **Auth** — Privy `useIdentityToken()` provides the Bearer JWT for
   the LLM call. Same auth path the rest of the chat uses; PromptSeal
   adds nothing new on top.
3. **Tool loop** — `runToolLoop` fires `onLlmStart/End` and
   `onToolStart/End` for every boundary. Per-event the hooks bundle
   builds a 9-field canonical receipt body, sets `parent_hash` to the
   prior `event_hash`, signs with Ed25519, and `chain.append(...)`s into
   IndexedDB.
4. **Live integrity** — `chain.append` rejects any receipt whose
   `parent_hash` doesn't match the latest `event_hash`, or whose
   signature/hash fails to verify. Bad receipts can't even land.
5. **Side panel** — `PromptSealReceiptPanel` subscribes to the chain via
   Dexie `liveQuery` and renders cards per receipt as they stream in.
6. **Anchor** — On user click, the panel builds a Bitcoin-style Merkle
   tree over `event_hash` leaves, sends a self-send Base Sepolia tx
   with the 32-byte root in `tx.input`, and persists `merkleRoot,
   txHash, blockNumber, anchoredLeaves` on the `anchors` row.
7. **Verifier URL** — On "Open verifier", the panel reads the target
   receipt and the **anchored leaves snapshot** (not live IndexedDB),
   computes an inclusion proof, packs `{receipt, proof, tx}` into the
   URL fragment, and `window.open`s the static verifier in a new tab.
8. **Verification** — Static HTML at `/promptseal-verifier/index.html`
   loads `verify.js` which runs five client-side checks. The only
   network calls are `eth_getTransactionByHash` to a Base Sepolia RPC
   and `cdn.jsdelivr.net` for `@noble/ed25519`.

## Verification model — five checks

`src/promptseal/verifier/verify.js`

1. Re-canonicalize receipt body, `sha256` → must equal stored
   `event_hash`.
2. Verify Ed25519 signature against `receipt.public_key` over the
   canonical bytes.
3. Walk the Merkle inclusion proof from leaf → reconstructed root.
4. Fetch anchor tx via JSON-RPC, read `tx.input` → on-chain root
   (must be exactly 32 bytes).
5. Reconstructed root from step 3 must equal on-chain root from step 4.

If all pass: the receipt is authentic, was signed by the agent at the
key registered in ERC-8004, and was committed to a specific Base Sepolia
block at the time of anchor.

## Leaves snapshot pattern

The chat-integrated path has a known race: `runToolLoop` keeps emitting
receipts after the panel flips to "RUN COMPLETE" (the post-decision LLM
wrap-up call adds two more receipts). If anchor fires before those
land, the live IndexedDB receipt list at verify time differs from the
leaf set the on-chain root was computed over.

**Fix:** at anchor time, snapshot the ordered `event_hash` list onto
the anchor row (`anchors.anchoredLeaves: string[]`). On verify,
`buildVerifierUrl` reads `anchorRow.anchoredLeaves` rather than
re-scanning live receipts. Old anchor rows without the field fall back
to live scan for back-compat.

This also means a separately-running verifier server only needs the
anchor row to compute proofs for any leaf — it never has to scrape
live receipts from the user's IndexedDB.

## Trust model — V1 demo grade

- **Agent secret** is delivered to the browser via
  `NEXT_PUBLIC_PROMPTSEAL_AGENT_SK`. Anyone who opens the demo URL can
  extract it from the JS bundle and forge receipts under token #634's
  identity. Acknowledged.
- **Anchor wallet** is also browser-bundled
  (`NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_SK`). Anyone with the bundle can
  drain the wallet or spam the chain.
- Production deployment uses a server-side signing relayer, not a
  client-bundled key. Today proves the integration shape and the
  cryptographic guarantees, not the operational security.

## File map

### SDK (`@anuma-ai/sdk`)

```
src/lib/chat/
  receiptHooks.ts          # Generic hook event types
  toolLoop.ts              # Hook firing points; runId override

src/promptseal/
  canonical.ts             # Sorted-keys JSON, number preservation
  crypto.ts                # @noble/ed25519 sign/verify
  receipt.ts               # 9-field whitelist, body bytes, verifyReceipt
  chain.ts                 # Dexie tables: runs, receipts, anchors,
                           #   tamperedBackups. anchoredLeaves on anchor row.
  merkle.ts                # Bitcoin-style tree, dup-last on odd
  anchor.ts                # viem self-send to Base Sepolia
  erc8004.ts               # readAgentCard(tokenId)
  hooks.ts                 # createPromptSealHooks(): adapts SDK events
                           #   to signed-receipt emissions
  verifier/
    index.html             # Static page, fragment prefill
    verify.js              # 5-step orchestrator
    canonical.js           # JS twin of canonical.ts (no SDK runtime)
    style.css

src/agents/promptseal/
  prompt.ts                # Hiring system prompt (verbatim Python port)
  tools.ts                 # parse_resume, score_candidate, decide
  resumes.ts + data/       # Fixture resumes (res_001..res_005)
  useHiringDemo.ts         # Standalone QA hook (separate from chat path)
```

Tests: 104 across canonical, crypto, receipt, merkle, cross_lang,
chain, toolLoop receipts, and useHiringDemo.

### Client (`zeta-chain/ai-memoryless-client`)

```
apps/web/
  hooks/
    usePromptSealHooks.ts          # Module-singleton ReceiptChain;
                                   #   builds hooks when activeTool is
                                   #   'promptseal-screen'; auto-opens panel
                                   #   on first onLlmStart
    useFullscreenReceiptStore.ts   # Zustand: panel runId state
    useChatStorageSetup.ts         # Forwards receiptHooks to SDK's
                                   #   useChatStorage (modified)
    useChatSetup.tsx               # Threads activeTool through (modified)
  components/Home/
    Chat.tsx                       # Mounts <PromptSealReceiptPanel />
    components/PromptSealReceiptPanel.tsx   # Side panel: header, receipt
                                            #   stream, anchor/verify/tamper
    components/Agents/             # Catalog entry, modal routing
    components/ChatCreationMenu.tsx
  app/promptseal-demo/             # Standalone QA route (uses Privy JWT
                                   #   directly via useIdentityToken)
  public/promptseal-verifier/      # Mirrored from SDK's
                                   #   dist/promptseal/verifier/ at install
  next.config.mjs                  # CSP connect-src includes sepolia.base.org
  middleware.ts                    # Excludes /promptseal-demo from locale router
  messages/                        # i18n strings for agent catalog
scripts/
  copy-promptseal-verifier.mjs     # postinstall mirror script
```

## How to run end-to-end

```bash
# In SDK repo
cd /path/to/anuma-sdk
git checkout promptseal-demo
pnpm install
pnpm build      # populates dist/

# In client repo
cd /path/to/ai-memoryless-client
git checkout promptseal-demo
pnpm install    # postinstall mirrors verifier into apps/web/public/
pnpm --filter web dev --webpack   # Next.js 16 + Turbopack has [locale] race;
                                  # pass --webpack until that's fixed
```

Then in browser:

1. Open `http://localhost:3000`
2. Sign in with Privy
3. New Chat → "Select Agent" dropdown (bottom-right of composer) →
   pick "PromptSeal Hiring Demo". The chip
   `Hiring screen (PromptSeal)` appears above the input.
4. Type `screen res_002` → send.
5. Side panel opens, receipts stream live with hash chain, tool calls,
   final decision (`REJECT res_002` for this resume).
6. After RUN COMPLETE → Anchor on Base Sepolia → confirms a real tx on
   `0x9718…DE2A`'s nonce sequence.
7. Open Verifier → verifier loads the receipt + proof + tx via URL
   fragment, runs 5 checks → `✓ VERIFIED`.

Optional: try the standalone QA route at `/promptseal-demo` —
single-page demo using the same SDK primitives, no chat UI.

## Live anchors (Base Sepolia)

Demo wallet: `0x9718C1CF0C96dde2fb9D820d06785A976972DE2A`

| Date | Block | Tx | Notes |
|---|---|---|---|
| 2026-05-06 | 41168426 | [`0x6920513f…`](https://sepolia.basescan.org/tx/0x6920513f590679f0cd93b65f4dd456e1fcb30143026dbb1041ce649331b9c5fc) | smoke (5 fixture receipts) |
| 2026-05-07 | 41200610 | [`0x5fe1c96e…`](https://sepolia.basescan.org/tx/0x5fe1c96e4fdb4c810f4115be3a51b92b80d41cbe7ad908d33c03669a706a0326) | first chat-integrated; failed verify (leaves drift) |
| 2026-05-07 | 41201257 | [`0xd554ac51…`](https://sepolia.basescan.org/tx/0xd554ac51cd4b0e5bb4e7313b2956c403cf16f273dfb983511096cb8383ea8241) | second; verified ✓ (waited for stable count) |
| 2026-05-07 | (post-fix) | [`0xb103fc53…`](https://sepolia.basescan.org/tx/0xb103fc538a21a202309fef907e6c18fabc295ab385b79e14685d830b964a753a) | third; deliberately drifted (anchor=14, post=15), still verified ✓ |

## Known caveats / next moves

- **Agent + wallet keys browser-bundled.** Dev/demo only. Replace with
  server-signing relayer for production.
- **No portal-side persistence of receipts.** Receipts live only in
  the user's browser IndexedDB. A separately-running verifier service
  needs the bundle pushed to it (see "leaves snapshot pattern" above —
  the anchor row is now self-contained, ready for a `POST /receipts`
  endpoint).
- **Verifier doesn't cross-check ERC-8004.** Step 2 verifies the
  signature against `receipt.public_key`, but doesn't confirm that
  pubkey is what's registered in token #634. Adding a second RPC call
  to read the agent registry would close that gap.
- **Verifier doesn't check anchor `tx.from`.** Anyone could anchor any
  32 bytes. Real-world: assert `tx.from == expected agent wallet`.
- **Next.js 16 Turbopack has a `[locale]` build-manifest bug.** `--webpack`
  workaround until upstream fixes it.

## Related docs

- `BRANCH_NOTES.md` (in both repos) — phase-by-phase changelog of what
  landed in this branch
- `/Users/tanmay/IdeaProjects/kingpinXD/promptseal/docs/ARCHITECTURE.md`
  — original Python reference architecture (source of truth for the
  receipt schema, canonical fields, signing semantics)
- `/Users/tanmay/IdeaProjects/kingpinXD/promptseal/docs/CHAT_INTEGRATION.md`
  — phase plan for the chat-integrated path (Phases 3, 4, 6 are done
  on this branch; the leaves-snapshot fix from Phase 6 is now landed)
