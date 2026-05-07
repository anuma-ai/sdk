# PLAN: ai-memoryless-client — PromptSeal demo migration

> **Read `ARCHITECTURE.md` first.** This plan executes one half of the
> migration. The other half (`PLAN_SDK.md`) runs in parallel against the
> same interface contract.

## Repo & branch

```bash
cd /Users/tanmay/IdeaProjects/jedi2002/ai-memoryless-client
git checkout main && git pull
git checkout -b promptseal-demo
```

## Goal

Land five buckets of work on the `promptseal-demo` branch:

- **A.** Augment `AgentSelectorModal` with a "PromptSeal Hiring Demo" entry
  that routes to `/promptseal-demo`
- **B.** New Next.js route `/promptseal-demo` with a three-panel UI
- **C.** Six React components (page, header, picker, stream, anchor panel,
  tamper controls)
- **D.** Static verifier copy step (postinstall) — pulls files from the
  SDK package
- **E.** `.env.local` with demo wallet + agent secret + RPC config

No upstream PR. All work stays branch-local. Links against the SDK's
`promptseal-demo` branch via `pnpm link`.

## Setup

```bash
pnpm install

# Link the SDK branch (PLAN_SDK.md must be at least partially landed)
cd ../../kingpinXD/anuma-sdk          # adjust path as needed
pnpm link --global
cd -                                   # back to ai-memoryless-client
pnpm link --global @anuma/sdk

# If pnpm link gets weird with Next.js module resolution, fall back to:
# add to apps/web/package.json:
#   "@anuma/sdk": "link:../../../../kingpinXD/anuma-sdk"
# then: pnpm install
```

Set up env:

```bash
cp /Users/tanmay/IdeaProjects/kingpinXD/promptseal/.env.demo apps/web/.env.local
# Then add the bootstrapped agent SK (one-time):
cd /Users/tanmay/IdeaProjects/kingpinXD/promptseal
python3 -c "
from promptseal.crypto import load_private_key_pem, secret_key_bytes
from base64 import b64encode
sk = load_private_key_pem(open('agent_key.pem','rb').read())
print('NEXT_PUBLIC_PROMPTSEAL_AGENT_SK=' + b64encode(secret_key_bytes(sk)).decode())
" >> /Users/tanmay/IdeaProjects/jedi2002/ai-memoryless-client/apps/web/.env.local
```

That extracts the raw 32-byte ed25519 secret from the existing PEM and
writes it as a base64 env var the Next.js client can consume.

## Reference reading (do this before coding)

- [`./ARCHITECTURE.md`](./ARCHITECTURE.md) — canonical spec, especially
  §5 (runtime flow) and §6 (interface contract)
- This repo's existing slide-deck pattern (the architectural template):
  - `apps/web/hooks/useChatSetup.tsx:1492-1770` — system prompt switch +
    tool registration + storage adapter wiring
- This repo's existing agent picker UI:
  - `apps/web/components/Home/components/Agents/AgentSelectorModal.tsx:52-145`
  - `apps/web/components/Home/components/Agents/agentData.ts` (or wherever
    the agent registry merges with the API response)
  - `apps/web/components/Home/Chat.tsx:935-938` — `handleAgentsPill`
- This repo's existing receipt-shaped Activity sidebar (visual precedent):
  - `apps/web/components/Home/components/Activity/ToolActivitySection.tsx`
- v0.1 verifier (the visual precedent for the verifier page):
  - `/Users/tanmay/IdeaProjects/kingpinXD/promptseal/verifier/{index.html,style.css}`

## Acceptance criteria

The branch is ready to ship when:

1. `pnpm dev` starts the web app cleanly. No console errors.
2. Navigating to `/chat`, clicking `+`, clicking `Agents` shows the
   `AgentSelectorModal` with "PromptSeal Hiring Demo" listed at the top
   with a "Demo" badge.
3. Clicking the entry navigates to `/promptseal-demo` (no `chatMode`/
   `selectedAgent` side effects in the main chat).
4. `/promptseal-demo` renders the three-panel layout described in
   `ARCHITECTURE.md` §5.
5. Picking a resume + clicking Run streams ~14 receipts into the center
   panel within ~5 seconds. Chain integrity badge stays green throughout.
6. After Run completes, Anchor button enables. Click → real Base Sepolia
   TX confirms (~3s). Tx hash + Basescan link appear.
7. Click Verify → opens `/promptseal-verifier?receipt=...&proof=...&tx=...`
   in a new tab. The verifier loads, prefills three textareas, runs 5
   steps, GREEN ✓.
8. Click Tamper (defaults to `final_decision`) → corrupts payload in
   IndexedDB. Re-open verifier with the now-tampered receipt → RED ✗
   on step 1. Click Restore → verifier GREEN again.
9. The `AgentHeader` shows pubkey + `Token #633` with a clickable link
   to https://sepolia.basescan.org/token/0x7177...d09A?a=633.
10. Mobile bundle build doesn't break (pnpm typecheck for `apps/mobile`
    still green — we add no mobile code, just don't break existing).

---

## Bucket A — AgentSelectorModal augmentation

### A1. Add the demo entry to the agent registry

- **File:** `apps/web/components/Home/components/Agents/agentData.ts`
  (find via `grep -rn "topLevelAgents\|nameKey" apps/web/components/Home/components/Agents/`)
- **What:** add a local-only entry that the modal merges with the API
  response. Shape (mirror existing entries):
  ```ts
  {
    id: 'promptseal-demo',
    nameKey: 'agent.promptseal.name',
    taglineKey: 'agent.promptseal.tagline',
    avatar: { type: 'icon', icon: 'shield' },     // or whatever the existing avatar shape is
    isDemo: true,                                  // for the badge
    sortPriority: 0,                               // top of the list
    privateOnly: false,
    disabled: false,
  }
  ```
  Add corresponding i18n keys (`apps/web/i18n/locales/en.json` or wherever):
  - `agent.promptseal.name = "PromptSeal Hiring Demo"`
  - `agent.promptseal.tagline = "Cryptographically-receipted resume screen (live demo)"`

### A2. Modify `AgentSelectorModal` selection handler

- **File:** `apps/web/components/Home/components/Agents/AgentSelectorModal.tsx`
  around line 52-145 (`handleSelect`)
- **What:** if `agent.id === 'promptseal-demo'`, call `router.push('/promptseal-demo')`
  via `next/navigation` instead of the existing `setConversationAgent`
  / state setter path. Other agents continue using the existing path.
  ```ts
  const handleSelect = (agent: Agent) => {
    if (agent.id === 'promptseal-demo') {
      onOpenChange(false);
      router.push('/promptseal-demo');
      return;
    }
    // ... existing path
  };
  ```

### A3. Visual: "Demo" badge

- **File:** same modal component
- **What:** if `agent.isDemo`, render a small pill ("Demo") next to the
  name. Match existing badge / status indicator styling.

**Verify:** `pnpm dev`, navigate to `/chat`, click `+`, click `Agents`.
The PromptSeal entry shows at the top with a "Demo" badge. Clicking it
opens `/promptseal-demo` and does not affect `selectedAgent` /
`conversationId` state.

---

## Bucket B — `/promptseal-demo` route

### B1. Next.js route entry

- **File:** `apps/web/app/promptseal-demo/page.tsx`
- **What:**
  ```tsx
  'use client';
  import { HiringDemo } from './HiringDemo';
  export default function Page() {
    return <HiringDemo />;
  }
  ```

### B2. Layout and styling alignment

- **File:** `apps/web/app/promptseal-demo/HiringDemo.tsx`
- **Layout:** three-panel grid (left: ResumePicker; center: ReceiptStream;
  right: AnchorPanel). Use Tailwind matching the existing app's dark theme.
- **No auth gate.** Public route.
- **No conversation persistence.** Local component state only (the
  receipts live in IndexedDB via `ReceiptChain`).

---

## Bucket C — UI components

### C1. `AgentHeader.tsx` — identity bar

```tsx
// apps/web/app/promptseal-demo/AgentHeader.tsx
import Link from 'next/link';

export function AgentHeader({ agentId, publicKey, tokenId, registryAddress, chainOk }: Props) {
  const basescanUrl = `https://sepolia.basescan.org/token/${registryAddress}?a=${tokenId}`;
  return (
    <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-6 text-sm">
      <span className="font-semibold">🛡 PromptSeal Hiring Demo</span>
      <span className="text-zinc-400">Agent: <code>{agentId}</code></span>
      <span className="text-zinc-400">Pubkey: <code className="font-mono">{publicKey.slice(0, 24)}…</code></span>
      <Link href={basescanUrl} target="_blank" className="text-blue-400 hover:underline">
        ERC-8004 #{tokenId} ↗
      </Link>
      <span className={chainOk === false ? 'text-red-400' : 'text-green-400'}>
        Chain {chainOk === false ? '✗' : '✓'}
      </span>
    </header>
  );
}
```

### C2. `ResumePicker.tsx` — left panel

5 resume cards (one per `RESUMES` entry from `@anuma/sdk/agents/promptseal`).
Each card: name, role, brief highlight, radio for selection. "Run" button
below.

```tsx
import { RESUMES } from '@anuma/sdk/agents/promptseal';

export function ResumePicker({ selected, onSelect, onRun, status }) {
  return (
    <aside className="w-80 border-r border-zinc-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300">📋 Pick a candidate</h2>
      {RESUMES.map(r => (
        <label key={r.id} className="block p-3 border border-zinc-800 rounded cursor-pointer hover:border-blue-500">
          <input type="radio" name="resume" checked={selected === r.id} onChange={() => onSelect(r.id)} />
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-zinc-400">{r.yoe_react}y React, {r.yoe_python}y Py</div>
          <div className="text-xs text-zinc-500 truncate">{r.education}</div>
        </label>
      ))}
      <button
        disabled={!selected || status === 'running'}
        onClick={onRun}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 rounded text-white font-medium"
      >
        {status === 'running' ? '⏳ Running…' : '▶ Run Agent'}
      </button>
    </aside>
  );
}
```

### C3. `ReceiptStream.tsx` — center panel

- Subscribes to `receipts` from `useHiringDemo()`
- Renders one card per receipt with: index #, event_type (color-coded),
  event_hash (truncated, monospace), timestamp, brief plaintext fields
- `final_decision` receipt highlighted with the decision banner
- Scrolls to latest on new receipt

Color coding:
- LLM events: blue
- Tool events: green
- final_decision: gold/yellow with prominent label
- error: red

### C4. `AnchorPanel.tsx` — right panel

Three sub-sections:

1. **Status banner** — current state (idle / running / run-complete / anchored)
2. **Anchor button** — disabled until run-complete. Click → calls
   `anchor()`. Shows tx hash + Basescan link after.
3. **Verify section** — disabled until anchored. Receipt dropdown,
   "Open Verifier →" button. Calls `buildVerifierUrl(storageId, '/promptseal-verifier')`
   and opens new tab. The returned URL uses a **fragment** (`#receipt=...&proof=...&tx=...`),
   not a query string — receipt JSON can be 1–3 KB and using `?query=` risks
   hitting the ~8 KB practical URL ceiling on a future schema growth. The
   fragment never leaves the client (not transmitted to the server).
4. **Tamper section** — disabled until anchored. Receipt dropdown
   (default: `final_decision`), Tamper button, Restore button. Uses the
   chain's storage IDs (from `chain.listReceiptRecords(runId)`) — the
   storage ID is a UI-only handle, never part of the canonical receipt body.

### C5. The page wires it all together

```tsx
// HiringDemo.tsx
'use client';
import { useHiringDemo } from '@anuma/sdk/agents/promptseal';
import { AgentHeader } from './AgentHeader';
import { ResumePicker } from './ResumePicker';
import { ReceiptStream } from './ReceiptStream';
import { AnchorPanel } from './AnchorPanel';
import { useState } from 'react';

export function HiringDemo() {
  const [selected, setSelected] = useState<string | null>(null);

  const demo = useHiringDemo({
    walletPrivateKey: process.env.NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_SK as `0x${string}`,
    agentSecretKey: process.env.NEXT_PUBLIC_PROMPTSEAL_AGENT_SK!,
    agentTokenId: 633,
  });

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <AgentHeader
        agentId="hr-screener-v1"
        publicKey={demo.publicKey}
        tokenId={633}
        registryAddress="0x7177a6867296406881E20d6647232314736Dd09A"
        chainOk={demo.chainOk}
      />
      <main className="flex-1 flex overflow-hidden">
        <ResumePicker
          selected={selected}
          onSelect={setSelected}
          onRun={() => selected && demo.run(selected)}
          status={demo.state}
        />
        <ReceiptStream receipts={demo.receipts} />
        <AnchorPanel demo={demo} />
      </main>
    </div>
  );
}
```

---

## Bucket D — Static verifier copy

### D1. Postinstall script

- **File:** `apps/web/package.json`
- **Add to `scripts`:**
  ```json
  {
    "scripts": {
      "postinstall": "node ../../scripts/copy-promptseal-verifier.mjs"
    }
  }
  ```
- **New file:** `scripts/copy-promptseal-verifier.mjs` (at repo root)
  ```js
  import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
  import { resolve, dirname } from 'node:path';
  import { fileURLToPath } from 'node:url';

  const here = dirname(fileURLToPath(import.meta.url));
  const src = resolve(here, '..', 'node_modules/@anuma/sdk/dist/promptseal/verifier');
  const dest = resolve(here, '..', 'apps/web/public/promptseal-verifier');

  mkdirSync(dest, { recursive: true });
  for (const f of readdirSync(src)) {
    copyFileSync(resolve(src, f), resolve(dest, f));
  }
  console.log(`[promptseal] copied verifier files to ${dest}`);
  ```

### D2. Confirm

```bash
pnpm install                           # postinstall runs
ls apps/web/public/promptseal-verifier # should show 4 files
pnpm dev
open http://localhost:3000/promptseal-verifier  # GREEN ✓ on a sample receipt
```

---

## Bucket E — Env vars

### E1. `.env.local` for the web app

```bash
# apps/web/.env.local

# Demo wallet — Base Sepolia (faucet-funded)
NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_ADDRESS=0x9718C1CF0C96dde2fb9D820d06785A976972DE2A
NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_SK=0x70516dc060d9445585451c36559edfa08c6b6762fd3aaac4852cd8a38a94e70d

# Agent identity (Ed25519 raw 32-byte secret, base64)
# Generated one-time via the bootstrap script in Setup section
NEXT_PUBLIC_PROMPTSEAL_AGENT_SK=<base64 of agent_key.pem secret>

# Network
NEXT_PUBLIC_PROMPTSEAL_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_PROMPTSEAL_CHAIN_ID=84532

# ERC-8004
NEXT_PUBLIC_PROMPTSEAL_REGISTRY=0x7177a6867296406881E20d6647232314736Dd09A
NEXT_PUBLIC_PROMPTSEAL_TOKEN_ID=633
```

The `_PRIVATE_KEY` and `_AGENT_SK` env vars are deliberately `NEXT_PUBLIC_*`
because the demo signs entirely client-side. **This is acceptable only for a
testnet demo wallet.** Never use this pattern with mainnet keys.

### Security narrative for the demo opening

Anyone who opens the demo URL can extract these secrets from the
JavaScript bundle / dev tools and forge receipts under token #633's
identity from any client. This is acknowledged in `ARCHITECTURE.md` §7
as a V1 demo limitation — V2 closes it via a server-side signing relayer.

**What the demo opening should explicitly say (avoids gotcha-pointing in Q&A):**

> *"This is a testnet integration showcase. Production deployment uses a
> server-side signing relayer, not a client-bundled key. Today we're
> proving the integration shape — that anuma-sdk's `runToolLoop` hooks
> fit PromptSeal's receipt schema, that canonicalization is byte-equal
> across runtimes, and that on-chain anchoring + verification work
> end-to-end. The signing-key trust model is intentionally V1 demo-grade."*

---

## Interface contract — for parallel development

The SDK plan and this plan run in parallel. Until PLAN_SDK.md lands `@anuma/sdk/agents/promptseal`
and `@anuma/sdk/promptseal`, this plan can mock those imports against the
contract in `ARCHITECTURE.md` §6.

**Recommended mock pattern:**

Create `apps/web/app/promptseal-demo/__mocks__/sdk-stubs.ts`:

```ts
// Temporary mock — REMOVE before final integration
import type { Receipt } from './types';

export function useHiringDemo(opts: any) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [state, setState] = useState<'idle' | 'running' | 'run-complete' | 'anchored'>('idle');
  // ... stub run() that pushes fake receipts every 200ms
  return { run, anchor, tamper, restore, reset, state, receipts, runId: null,
           chainOk: true, anchorTx: null, finalDecision: null, error: null,
           buildVerifierUrl: () => '#', publicKey: 'ed25519:stub...' };
}

export const RESUMES = [/* same 5 entries from agent/data/resumes.json */];
```

When the SDK lands, replace these imports with `@anuma/sdk/agents/promptseal`
and delete the mock file. Single search-and-replace.

---

## What NOT to do (scope guards)

- ❌ Do not modify the existing chat flow / `useChatSetup.tsx` /
  `Chat.tsx` core logic. Only the agent picker is touched.
- ❌ Do not add the demo as a "tool" in `ChatCreationMenu.tsx`. It belongs
  in the agent picker, not the tool picker.
- ❌ Do not persist receipts to WatermelonDB. IndexedDB only (via the SDK's
  `ReceiptChain`). Keeps the demo's chain isolated from main chat history.
- ❌ Do not add Privy auth gating. Public route.
- ❌ Do not add mobile components (`apps/mobile/`).
- ❌ Do not change `next.config.js`, `tailwind.config.js`, or any shared
  config beyond adding the postinstall script.
- ❌ Do not push the branch to remote until the demo lands. Local only.
- ❌ Do not change the agent's tool schemas or system prompt — those live
  in the SDK package.

## Suggested order

1. Bucket E first (env vars set up).
2. Bucket D (verifier copy + postinstall) — this can be tested standalone
   against the existing v0.1 verifier in the promptseal repo before the
   SDK package is ready.
3. Bucket C with mocks (`__mocks__/sdk-stubs.ts`). Build all six components
   against the mocked `useHiringDemo`.
4. Bucket A (agent picker entry + route handler).
5. Bucket B (route entry — trivial, just the `<HiringDemo />` mount).
6. Final integration: replace mock imports with real `@anuma/sdk/...` imports.
   Smoke test end-to-end.

## Open Q for the SDK side (track here, resolve before final integration)

- Does `useHiringDemo` internally call `useChatSubmitHandler` (existing wrapper) or
  directly `runToolLoop`? PLAN_SDK.md C4 should pick one — the client doesn't care
  as long as the returned shape matches §6. (Recommend: `runToolLoop` directly,
  since `useChatSubmitHandler` carries chat-specific state we don't need.)
- Does the chain observable use Dexie's `liveQuery` or RxJS Subjects? Affects
  the `useLiveQuery` import in `ReceiptStream.tsx`. Default: Dexie's `liveQuery`
  with `dexie-react-hooks`.

## When done

- `pnpm dev` and walk through the demo storyboard from `ARCHITECTURE.md` §5
  end-to-end on localhost.
- Document Base Sepolia anchor TXs from a few demo runs in a `BRANCH_NOTES.md`
  at the repo root.
- Notify the SDK-side agent that the client is integrated and the link is
  working.
