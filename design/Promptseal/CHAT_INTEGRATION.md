# PromptSeal — production chat integration

> **Supersedes** the demo-grade approach in `PLAN_CLIENT.md` (standalone
> `/promptseal-demo` route). That route was scoped to a 5-minute demo and
> deliberately bypassed Privy/JWT/chat-context. Production launch (one-week
> horizon) requires PromptSeal to behave like Slidedeck and Haven: a tool
> the user invokes inside their normal chat conversation, using their
> existing session, posting messages on their behalf.
>
> The SDK work in `PLAN_SDK.md` (canonical receipts, hooks, hash chain,
> Merkle, anchor, ERC-8004 read) **stays as-is**. Only the client integration
> and the SDK's exposed agent surface change.

## 1. Goal

PromptSeal is a chat tool, on equal footing with Slidedeck. The user:

1. Types in the chat input (or uses any normal chat affordance)
2. Clicks `+` → picks "PromptSeal Hiring Screen" from the tool menu
3. Sends a prompt like "screen Bob Martinez" (or pastes a resume)
4. Watches the assistant's response stream into the chat thread as usual
5. Sees a side panel open showing the live receipt stream (analog of
   `FullscreenSlideDeckPanel`)
6. Clicks Anchor / Verify / Tamper from the side panel header
7. The conversation persists in WatermelonDB like any other chat

**No standalone route. No separate auth. No env-injected agent SK or wallet
SK exposed to the bundle. Match Anuma's existing visual system entirely.**

## 2. Slide-deck pattern (the reference)

From the Explore findings, here's how Slidedeck flows end-to-end:

```
┌──── ChatCreationMenu.tsx:152-159 ──────────────┐
│  { id: 'create-slides', icon: Presentation }   │
│  Click → onToolChange('create-slides')         │   ← entry point
│  → activeTool = 'create-slides'                │
└─────────────────────────────────────────────────┘
           │
           ▼
┌──── useChatSetup.tsx:1492-1499 ────────────────┐
│  if (activeTool === 'create-slides')           │
│    return buildSlideSystemPrompt();            │   ← system prompt branch
└─────────────────────────────────────────────────┘
           │
           ▼
┌──── useChatSetup.tsx:1708-1774 ────────────────┐
│  createSlideTools({                            │
│    storage: { getFile, putFile },              │   ← OPFS adapter
│    displaySlides: callback                     │   ← side-panel hook
│  })                                            │
│  → composed into clientTools array             │   ← tool registration
└─────────────────────────────────────────────────┘
           │
           ▼
┌──── useChatStorageSetup.ts:239-259 ────────────┐
│  useChatStorage({                              │
│    getToken: getIdentityToken,                 │   ← Privy → JWT
│    onData: noop, …                             │
│  })                                            │
│  → returns sendMessage()                       │
└─────────────────────────────────────────────────┘
           │
           ▼
┌──── webChatSendMessage.ts:639-660 ─────────────┐
│  Bearer header from getToken                   │
│  POST /api/v1/chat/completions                 │   ← portal LLM
│  Streams tool calls back                       │
│  Tools execute locally; `display_slides`       │
│    callback fires `uiInteraction.create…`      │
│  Side panel mounts via                         │
│    `{fullscreenSlideOpen && <Panel />}`        │   ← Chat.tsx:1905
└─────────────────────────────────────────────────┘
```

Key properties of the pattern:
- **One unified `sendMessage()` path** for all tools and agents
- **JWT token from Privy** via `getIdentityToken`, embedded in Bearer header
- **System prompt selected by `activeTool`** (or `selectedAgentId` for
  Haven-style agents)
- **Tools registered via factories** (`createSlideTools(...)`) and composed
  into `clientTools`
- **UI rendering split**: messages render inline in the chat thread; rich
  artifacts (slide deck, app preview) get a fullscreen side panel
- **Persistence is automatic** — the chat path appends user/assistant/tool
  messages to WatermelonDB without any per-tool effort
- **`activeTool` resets manually** for slides (user clicks pill); resets
  automatically for agents (transient `'select-agent'` state)

## 3. What's reusable from the existing demo work

| Component | Verdict | Reason |
|---|---|---|
| `@anuma/sdk/promptseal/*` (canonical, crypto, receipt, chain, merkle, anchor, erc8004, hooks) | ✅ keep verbatim | Framework-level, correctly scoped, byte-equal to Python |
| `createPromptSealHooks(...)` | ✅ keep | Hook contract is correct; only the call site changes |
| Receipt hash-chain in IndexedDB | ✅ keep | Storage shape is right |
| Verifier static files (`@anuma/sdk/promptseal/verifier/*`) | ✅ keep | URL-fragment prefill works as-is |
| ERC-8004 token #634 + `agent_key.pem` + `.env.demo` (deployer wallet) | ✅ keep | On-chain identity + funded wallet stay |
| `runToolLoop` hooks (`onLlmStart`, `onLlmEnd`, `onToolStart`, `onToolEnd`, `runId`) | ✅ keep | Universal, useful beyond PromptSeal |
| SDK fixtures + cross-language byte-equality tests | ✅ keep | Foundational |
| `createHiringTools()` and `buildHiringSystemPrompt()` | 🟡 keep but may need shape changes | The tool defs themselves are right; how they compose with `clientTools` for chat may need adjusting |
| `useHiringDemo` React hook | 🟡 demote, don't delete | Useful as a standalone-test utility (SDK integration tests) and the existing `/promptseal-demo` route can stay as an internal fallback. **Not used by production chat path.** |
| `apps/web/app/promptseal-demo/*` (page, three-panel UI) | 🟡 demote, don't delete | Keep as `/promptseal-demo` for SDK QA. Production user flow does not go through this route. |
| `apps/web/.env.local` `NEXT_PUBLIC_PROMPTSEAL_*` env vars | ❌ remove from production path | The agent SK / wallet SK / LLM token must NOT live in the client bundle in production. Side discussion below in §8. |
| `agentEnrichment.ts` "PromptSeal Hiring Demo" agent entry | 🟡 keep but reshape | Stays in the agent picker, but as a chat-mode agent (Haven-style) routing into chat with tool active, not a `routePath` redirect |

## 4. Required SDK changes

Mostly small. The receipt SDK already does what we need; only the agent surface needs to shift.

### 4.1 Expose receipt hooks for the chat path

Currently `useHiringDemo` instantiates its own `runToolLoop` with `createPromptSealHooks(...)` attached. For the chat integration, the hooks need to be attached to the **chat's** runToolLoop call (which lives inside `useChatStorage` / the SDK's chat-storage layer).

Two options:

**Option A — extend `useChatStorage` to accept receipt hooks.**

```ts
useChatStorage({
  getToken,
  receiptHooks: createPromptSealHooks({ chain, sk, agentId, agentTokenId }),
  ...
})
```

Then `useChatStorage` forwards them to `runToolLoop`. Cleanest at the
consumer layer; requires editing `@anuma/sdk/react`.

**Option B — wrap `clientTools` with receipt-emitting wrappers.**

Each tool executor's invocation gets wrapped with sign+store. LLM-side
events (start/end) stay outside the chain — only tool events captured.
Loses parity with v0.1 schema (no `llm_start`/`llm_end` receipts) but
requires zero SDK changes beyond what we have.

**Recommend Option A.** It preserves schema parity with the v0.1 Python
demo, keeps the hook contract uniform, and the SDK change is small (~30
lines, additive).

### 4.2 Export pure factories

Make sure the chat path can compose without using `useHiringDemo`:

```ts
// already exported per current dist/agents/promptseal/index.d.ts:
export { createHiringTools, buildHiringSystemPrompt, RESUMES };

// add (if not already):
export { createPromptSealHooks, ReceiptChain };  // both already in @anuma/sdk/promptseal
```

No new exports beyond what's there. Good.

### 4.3 Optional: receipt-rendering React component

A small `<ReceiptStreamPanel>` that subscribes to a `ReceiptChain` for a
given `runId` and renders the live cards we already built. Lives in
`@anuma/sdk/agents/promptseal/components/`. Optional — the client could
ship its own panel — but nice for reuse.

## 5. Required client changes

### 5.1 ChatCreationMenu — add the tool entry

`apps/web/components/Home/components/ChatCreationMenu.tsx:152-159` style:

```tsx
{
  id: 'promptseal-screen' as const,
  labelKey: 'chatInput.promptsealScreen' as const,
  icon: Shield,                // or ShieldCheck from lucide-react
  iconClassName: 'text-blue-500',
  iconProps: { strokeWidth: 1.5 },
  mobileLabelKey: 'chatInput.promptsealScreen',
}
```

Add to `ActiveTool` union and the `TOOLS` array. Add i18n keys for
`chatInput.promptsealScreen` to `apps/web/messages/en.json`.

### 5.2 useChatSetup.tsx — system prompt + tools branch

`apps/web/hooks/useChatSetup.tsx:1492-1499` extension:

```tsx
if (activeTool === 'promptseal-screen') {
  return buildHiringSystemPrompt();  // from @anuma/sdk/agents/promptseal
}
```

Tool composition near `useChatSetup.tsx:1708-1774`:

```tsx
const promptsealTools = useMemo(
  () => (activeTool === 'promptseal-screen' ? createHiringTools() : []),
  [activeTool]
);

// ... in clientTools assembly:
const clientTools = useMemo(() => {
  if (activeTool === 'create-slides') return [...slideTools, ...];
  if (activeTool === 'promptseal-screen') return [...promptsealTools, ...baseTools];
  return baseTools;
}, [activeTool, slideTools, promptsealTools, baseTools]);
```

### 5.3 Wire receipt hooks into useChatStorage

```tsx
// apps/web/hooks/useChatStorageSetup.ts (or sibling)
const promptsealChain = useMemo(() => new ReceiptChain('promptseal'), []);
const receiptHooks = useMemo(() => {
  if (activeTool !== 'promptseal-screen') return undefined;
  return createPromptSealHooks({
    chain: promptsealChain,
    sk: agentSecretKeyBytes,           // see §8
    agentId: 'hr-screener-v1',
    agentTokenId: 634,
  });
}, [activeTool, agentSecretKeyBytes]);

useChatStorage({
  getToken: getIdentityToken,
  receiptHooks,                        // NEW — see SDK §4.1
  ...
});
```

### 5.4 Side panel for receipts (analog of FullscreenSlideDeckPanel)

```tsx
// apps/web/components/Home/components/PromptSealReceiptPanel.tsx
// Subscribes to the chain via useLiveQuery or chain.observe(runId).
// Header: AgentHeader (pubkey + token #634 + basescan link + state pill)
// Body:   ReceiptStream (the live cards)
// Footer: AnchorPanel (anchor + verify + tamper buttons)
```

Mount in `apps/web/components/Home/Chat.tsx:1905`-ish:

```tsx
{fullscreenSlideOpen && <FullscreenSlideDeckPanel />}
{fullscreenReceiptOpen && <PromptSealReceiptPanel />}   // NEW
```

Driven by a Zustand store like `useFullscreenReceiptStore()`. The receipt
hook's `onLlmStart` / first event opens the panel automatically.

The 200-line components we already wrote (`AgentHeader`, `ResumePicker`,
`ReceiptStream`, `AnchorPanel`) are 90% reusable for this — they just need
to be re-mounted inside the side panel layout instead of the standalone
route layout. ResumePicker probably moves into the side panel too, since
the chat's input is where the user types prompts but the resume picker is
ergonomically a button grid.

Actually the better pattern: drop ResumePicker entirely. The user types
"screen Bob Martinez" or "screen res_002" in the chat input; the model
calls `resume_parse` with the right id. The receipt panel is purely a
viewer + control surface, not an input.

### 5.5 AgentSelectorModal entry

The existing entry in `agentEnrichment.ts:488-510` stays but reshapes:
- Drop `routePath` (no more route redirect)
- Add `defaultActiveTool: 'promptseal-screen'` so selecting it sets the
  tool and stays in chat
- Selection handler in `AgentSelectorModal.tsx` and `Chat.tsx` checks for
  `defaultActiveTool` instead of `routePath`

### 5.6 i18n strings

`apps/web/messages/en.json`:

```json
"chatInput": {
  "promptsealScreen": "Hiring screen (PromptSeal)"
},
"agents": {
  "promptseal": {
    "name": "PromptSeal Hiring Screen",
    "tagline": "Cryptographically-receipted resume screen",
    "description": "..."
  }
}
```

## 6. UI rendering decisions

| Concern | Decision |
|---|---|
| Where receipts render | Side panel (FullscreenSlideDeckPanel-style), NOT inline as messages. Receipts are a continuous stream that should not interleave with the chat conversation. |
| When the panel opens | Auto-opens on first receipt of a new `runId`. User can close/re-open. |
| What goes inline in the chat | The user's prompt, the model's tool-use rounds (rendered like any chat tool call), and the model's final assistant text ("Screened Bob Martinez — REJECTED, weak fundamentals"). The decision banner can be a special inline tool-result card. |
| Anchor / Verify / Tamper buttons | Inside the side panel header. Live alongside the receipt stream. |
| Resume picker | **Remove.** Users type the resume id (or copy-paste a resume). The model handles `resume_parse`. Lower friction, more chat-native. For demo polish, the model's first response can include a "pick: res_001 / res_002 / res_003 / res_004 / res_005" suggestion. |
| Tamper UX | Side panel has a per-receipt "tamper" icon (small skull). Click → confirms in modal → corrupts payload. Restore button shows after tamper. |
| Verifier UI | Stays at `/promptseal-verifier` (separate page). ✅ confirmed 2026-05-07 — fine for this iteration. Future: could embed inside the side panel if needed. |

### 6.1 Visual alignment with existing Anuma chat UX

The current `/promptseal-demo` route uses bespoke flex layouts and dark
zinc colors that don't match Anuma's chat. **Throw out the standalone
visual style; rebuild the side panel using existing primitives only.**

Hard requirements:

- **Use the same primitives as `FullscreenSlideDeckPanel`**. Whatever
  Dialog/Sheet/Popover wrapper it uses, ours uses the same. Same border
  radius, same shadow, same backdrop blur, same close-button placement.
- **Tailwind tokens, not hardcoded colors.** `bg-surface`,
  `bg-surface-secondary`, `text-foreground`, `text-text-muted`, the
  Anuma accent class — match what the rest of the chat uses. No more
  `bg-zinc-950` / `bg-zinc-900/40` hardcoded zinc shades.
- **Lucide-react icons with `strokeWidth: 1.5`** to match the
  ChatCreationMenu's existing icon style (Presentation, Zap, Image, etc.
  all use 1.5).
- **Buttons use the existing button component**. Same primary / secondary
  / destructive variants. Don't ship inline-styled `<button>` tags with
  custom class lists.
- **Receipt cards use the same card primitives** as `ToolActivitySection`
  in the existing Activity sidebar (per the earlier Explore finding —
  that's the closest existing analog: a list of tool-event cards with
  truncated identifiers, timestamps, and color-coded pills).
- **Typography matches**. Body in the chat's default sans, hashes in the
  app's existing mono token (whatever class the rest of the chat uses for
  monospace fragments).
- **Status pills** ("Idle", "Running", "Anchored") use the same styling
  pattern as the existing chat's badge/pill components — not custom
  background gradients.
- **Spacing scale matches**. Use the existing 1/2/3/4 step spacing rather
  than ad-hoc `p-3` `gap-1.5` mixes.

Practically: when lifting `AgentHeader` / `ReceiptStream` / `AnchorPanel`
from `/promptseal-demo` into the side panel, the JSX structure (3-row
header, scrollable receipt list, action footer) is correct, but every
className gets replaced to match the Slidedeck panel's existing token
usage. Keep the layout, swap the styles.

**Reference files for what to match (read these before writing JSX):**
- `apps/web/components/Home/components/FullscreenSlideDeckPanel.tsx` —
  side panel structure, animations, close behavior
- `apps/web/components/Home/components/Activity/ToolActivitySection.tsx`
  — receipt-card analog (tool-event list)
- `apps/web/components/Home/components/Agents/AgentSelectorModal.tsx` —
  Dialog primitive in use
- `apps/web/components/Home/components/ChatCreationMenu.tsx:152-159` —
  icon + label pattern for the new tool entry

## 7. Token flow (the critical path)

Slidedeck flow: `Privy.getAccessToken()` → `useGetIdentityToken` →
`useChatStorageSetup({ getToken })` → `useChatStorage({ getToken })` →
Bearer header.

PromptSeal mirrors this **exactly** for the LLM call. The user's existing
chat session carries the auth. Zero new env vars in the bundle.

## 8. Where the agent's Ed25519 signing key lives — scoping decision

**Decision (2026-05-07):** Hardcoded `NEXT_PUBLIC_PROMPTSEAL_AGENT_SK` +
`NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_SK` in the bundle stay for this
iteration. Per-user keys / server signing relayers are production-time
refactor work, deferred to a later phase.

**What this means for §11 acceptance and §12 timeline:**
- The signing key bundled in `.env.local` is acceptable for this build.
- Token #634 + `agent_key.pem` remains the single shared agent identity.
- Anchor TX continues to be paid by the funded demo wallet (Base Sepolia
  faucet ETH; private key in `.env.local`).
- The proof creation / verification layer (canonical, sign, hash-chain,
  Merkle, anchor, verifier) is non-production by design and gets
  refactored when we move to launch.

**What MUST change for this iteration (non-negotiable):**
- The **LLM call's Bearer token** comes from the user's Privy session, not
  from `NEXT_PUBLIC_PROMPTSEAL_LLM_TOKEN`. This is the JWT that connects
  the user's identity to Anuma's portal — same flow Slidedeck and Haven
  use. Hardcoding this would mean every demo run hits the portal as some
  shared service account; we want the user's actual session.
- `NEXT_PUBLIC_PROMPTSEAL_LLM_TOKEN` env var is removed. The
  `useChatStorage` path injects the JWT automatically via
  `getIdentityToken`.

**Production-future (out of scope for this iteration):**
- Move agent SK from bundle to per-user IndexedDB key OR server-side
  signing relayer (the original Options A/B above)
- Move demo wallet SK from bundle to sponsor relayer or user's embedded wallet
- These can be hot-swapped later because the SDK already accepts these
  values via constructor args; refactor is at the call site, not the
  schema or hooks.

## 9. Open architectural questions

1. ~~**Where does `runToolLoop` run for the chat path?**~~ ✅ **Resolved
   2026-05-07.** Client-side, same as Slidedeck. Our existing hooks
   (`onLlmStart`, `onLlmEnd`, `onToolStart`, `onToolEnd`, `runId`) plug
   straight into the chat's loop. SDK §4.1 stays a small additive
   change — extend `useChatStorage` config with `receiptHooks` and
   forward to the underlying client-side `runToolLoop` invocation.

2. ~~**If runToolLoop runs server-side, can we still attach hooks…?**~~
   ✅ **Moot** — runs client-side per (1).

3. ~~**Anchor TX from the client vs server.**~~ ✅ **Client.** Bundled
   demo wallet signs and submits via viem (current behavior). Refactor
   to sponsor relayer / user wallet is deferred per §8.

4. ~~**Per-user ERC-8004 minting strategy.**~~ ⏸ **Deferred per §8.**
   Single shared identity (token #634) for this iteration.

5. **Receipt persistence durability.** IndexedDB only for this iteration.
   WatermelonDB sync for cross-device receipts is V2.

6. **Verifier hosting.** Stays at `apps/web/public/promptseal-verifier/`
   on the same Next.js dev server for this iteration. ✅ **Confirmed
   2026-05-07** — same-page verifier is fine for testing; we don't need
   to refactor where it's hosted now.

## 10. Migration strategy

Both can coexist during the cut-over:

- **Phase 1 (now)**: Land the chat-tool integration as the production path. Keep `/promptseal-demo` route as an internal QA fallback (it has its own state machine, doesn't interfere with main chat).
- **Phase 2 (after launch)**: If `/promptseal-demo` isn't used in production, remove it. The 350 lines of standalone route + UI become dead code; their constituent components (`AgentHeader`, `ReceiptStream`, `AnchorPanel`) are reused inside the side panel anyway.

Nothing in the current demo work blocks the chat-tool integration — it's parallel work, not throwaway.

## 11. Acceptance criteria for this iteration

| Required | |
|---|---|
| User opens `/chat`, types a message, picks PromptSeal from `+` menu | ✓ tool active, system prompt switches |
| User sends "screen res_002" | ✓ assistant runs, tool calls fire, receipts appear in side panel |
| Receipts persist across page reloads | ✓ IndexedDB |
| Anchor button works from side panel | ✓ TX submitted via bundled demo wallet |
| Verify button opens `/promptseal-verifier` with prefilled fragment | ✓ same as current demo |
| Tamper / Restore work | ✓ as today |
| **`NEXT_PUBLIC_PROMPTSEAL_LLM_TOKEN` removed; LLM JWT comes from Privy** | ✓ via `useChatStorage({ getToken })` — load-bearing for this iteration |
| Visual style matches existing chat | ✓ side panel uses same primitives as `FullscreenSlideDeckPanel` |
| Type-check + tests green | ✓ no regressions in existing chat flow |

| Deferred to production refactor (NOT required this iteration) | |
|---|---|
| Move `NEXT_PUBLIC_PROMPTSEAL_AGENT_SK` out of bundle | ⏸ later — per-user key or relayer |
| Move `NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_SK` out of bundle | ⏸ later — sponsor relayer or user wallet |
| Mobile (Expo) parity | ⏸ later |

## 12. Suggested order (compressed: key management deferred, runToolLoop confirmed client-side)

| Day | Work |
|---|---|
| 1 | SDK §4.1 — extend `useChatStorage` to accept `receiptHooks` and forward to its client-side `runToolLoop`. ~30 lines additive. Tests. |
| 1–2 | Client §5.1–§5.3 — ChatCreationMenu tool entry; system prompt branch in `useChatSetup.tsx`; tool registration via `createHiringTools()`; hook wiring with bundled SK + Privy JWT for the LLM call; remove `NEXT_PUBLIC_PROMPTSEAL_LLM_TOKEN`. |
| 2 | Read the reference files in §6.1 (FullscreenSlideDeckPanel, ToolActivitySection, AgentSelectorModal). Note the actual primitives, tokens, icon set in use. |
| 2–3 | Client §5.4 — build `<PromptSealReceiptPanel>` matching Slidedeck's side panel structure exactly. Lift `AgentHeader` / `ReceiptStream` / `AnchorPanel` JSX shapes from `/promptseal-demo`; **replace every className** with Anuma-aligned tokens per §6.1. Remove `ResumePicker`. |
| 3 | Client §5.5–§5.6 — AgentSelectorModal reshape (drop `routePath`, add `defaultActiveTool`); i18n keys. End-to-end smoke test: open `/chat`, pick PromptSeal from `+`, type "screen res_002", side panel opens with receipts, click Anchor → tx confirms, click Verify → opens `/promptseal-verifier` in new tab GREEN ✓, click Tamper → RED ✗, Restore → GREEN ✓. |
| 4 | Buffer / bug fixes. Hand-off note for production refactor team covering §8 deferred items (per-user keys, server signing relayer). |

---

## TL;DR — list of changes

**SDK (`anuma-sdk` — small, additive):**
1. Extend `useChatStorage` (or its underlying SDK loop wrapper) to accept `receiptHooks` config and forward them to `runToolLoop`. ~30 lines.
2. Verify `createHiringTools`, `buildHiringSystemPrompt`, `RESUMES`, `createPromptSealHooks`, `ReceiptChain` are all exported. (Already are per `dist/`.)
3. Optional: ship a `<ReceiptStreamPanel>` React component for reuse.

**Client (`ai-memoryless-client` — bigger, but well-scoped):**
4. Add `'promptseal-screen'` tool entry to `ChatCreationMenu.tsx` `TOOLS` array + `ActiveTool` union + i18n.
5. Branch in `useChatSetup.tsx:1492-1499` for system prompt selection.
6. Branch in `useChatSetup.tsx:1708-1774` area for tool composition.
7. Wire `receiptHooks` into `useChatStorage` when `activeTool === 'promptseal-screen'`.
8. Build `<PromptSealReceiptPanel>` side panel component, mount conditionally in `Chat.tsx:1905`.
9. Reshape `agentEnrichment.ts` `promptseal-demo` entry — drop `routePath`, add `defaultActiveTool`. Update `AgentSelectorModal` selection handler.
10. Per-user key management: generate Ed25519 keypair on first PromptSeal use, persist encrypted in IndexedDB, lazy-mint ERC-8004 token via sponsor wallet (or server relayer).
11. Remove all `NEXT_PUBLIC_PROMPTSEAL_*` agent secret / wallet secret env vars from `.env.local` for production builds.

**Things kept verbatim from existing work:**
- All of `@anuma/sdk/promptseal/*` (canonical, crypto, receipt, chain, merkle, anchor, erc8004, hooks, verifier static files)
- Token #634 binding + agent_key.pem (becomes the *first* user key for testing)
- Verifier static files + URL-fragment prefill
- The 4 React components (AgentHeader, ResumePicker→drop, ReceiptStream, AnchorPanel) — modulo re-mounting them inside the side panel layout

**Things kept as-is, demoted to internal QA tool:**
- `/promptseal-demo` route + its state machine and env-bundled keys (use only for SDK-level testing, not user-facing)
- `useHiringDemo` hook (used by `/promptseal-demo` route only)

**Things to delete now (this iteration):**
- `NEXT_PUBLIC_PROMPTSEAL_LLM_TOKEN` — replaced by Privy JWT via `useChatStorage`

**Things deferred to production refactor (NOT this iteration):**
- `NEXT_PUBLIC_PROMPTSEAL_AGENT_SK` — move to per-user IndexedDB or server signing relayer
- `NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_SK` — move to sponsor relayer or user wallet
- Removal of standalone `/promptseal-demo` route (kept as internal QA)
