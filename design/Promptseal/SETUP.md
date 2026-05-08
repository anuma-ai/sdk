# PromptSeal — local setup & testing

How to bring up the PromptSeal demo on a fresh machine, end-to-end.
Companion to `CONTEXT.md` (cross-repo overview), `DEMO_FLOW.md` (live
walkthrough), and `BRANCH_NOTES.md` (changelog).

> All work lives on branch `promptseal-demo` in two repos:
> `anuma-ai/sdk` (this one) and `zeta-chain/ai-memoryless-client`.

---

## Prerequisites

| Tool | Version | Used for |
|---|---|---|
| Node.js | 20+ | runtime |
| pnpm | 9+ | package manager |
| Chrome / Chromium | latest | browser (IndexedDB, Privy, Playwright) |
| git | any | both repos |
| Python 3 | 3.10+ | optional — only for regenerating cross-language fixtures |

You also need a small amount of Base Sepolia ETH on the demo wallet
(`0x9718C1CF0C96dde2fb9D820d06785A976972DE2A`). Each anchor tx costs
~0.0001 ETH. Faucet:
[Coinbase Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet).
~0.005 ETH covers a full demo session (~10 anchors).

---

## 1. Clone both repos

```bash
mkdir -p ~/IdeaProjects/{kingpinXD,jedi2002}
git -C ~/IdeaProjects/kingpinXD clone git@github.com:anuma-ai/sdk anuma-sdk
git -C ~/IdeaProjects/jedi2002 clone git@github.com:zeta-chain/ai-memoryless-client.git
```

(Different parent dirs are intentional — that's the directory layout
the `pnpm link:` path in `apps/web/package.json` expects. If your
layout differs, see *Adjusting the SDK link* below.)

```bash
cd ~/IdeaProjects/kingpinXD/anuma-sdk
git checkout promptseal-demo

cd ~/IdeaProjects/jedi2002/ai-memoryless-client
git checkout promptseal-demo
```

---

## 2. Install + build the SDK first

The client links against the SDK's built `dist/`, not its source. So
the SDK must be built before the client install runs (the client's
postinstall step copies the verifier from `dist/promptseal/verifier/`).

```bash
cd ~/IdeaProjects/kingpinXD/anuma-sdk
pnpm install
pnpm build         # writes dist/, including dist/promptseal/verifier/
pnpm vitest run    # ~947 tests, ~30s — sanity check
```

If you change anything under `src/` later, re-run `pnpm build`. The
client's `pnpm dev` does NOT rebuild the SDK; the link only resolves
to whatever's already in `dist/`.

---

## 3. Install the client + mirror the verifier

```bash
cd ~/IdeaProjects/jedi2002/ai-memoryless-client
pnpm install
```

The `postinstall` script (`scripts/copy-promptseal-verifier.mjs`)
mirrors the verifier files from
`@anuma/sdk/dist/promptseal/verifier/` into
`apps/web/public/promptseal-verifier/` so they can be served at
`/promptseal-verifier/index.html`.

Confirm it ran:

```bash
ls apps/web/public/promptseal-verifier/
# index.html  verify.js  canonical.js  style.css
```

---

## 4. Configure environment variables

Create `apps/web/.env.local` with the following entries:

```bash
# --- Privy (existing dev creds) ---
NEXT_PUBLIC_PRIVY_APP_ID=cmjkga3y002g0ju0clwca9wwp

# --- e2e test user (used by Playwright auth.setup.ts) ---
TEST_USER_EMAIL=test-9758@privy.io

# --- PromptSeal demo wallet (Base Sepolia) ---
# Browser-bundled. V1 demo grade — anyone with the bundle can drain it.
# Production deployment uses a server-side relayer, not a NEXT_PUBLIC key.
NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_ADDRESS=0x9718C1CF0C96dde2fb9D820d06785A976972DE2A
NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_SK=0x70516dc060d9445585451c36559edfa08c6b6762fd3aaac4852cd8a38a94e70d

# --- Agent signing key (Ed25519, 32-byte raw seed, base64) ---
# Same V1-demo caveat as above. Pubkey is on-chain in ERC-8004 token #634.
NEXT_PUBLIC_PROMPTSEAL_AGENT_SK=/JHIk6ySC8uwfVnDR2XNBJTsotmNBqN79dBy6hvs48Q=
NEXT_PUBLIC_PROMPTSEAL_AGENT_PK=ed25519:SnicCW2N4B819/ghY7JF5ZD9Qf1wRYyRAVhzGdXiQWg=

# --- Chain config ---
NEXT_PUBLIC_PROMPTSEAL_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_PROMPTSEAL_CHAIN_ID=84532
NEXT_PUBLIC_PROMPTSEAL_REGISTRY=0x7177a6867296406881E20d6647232314736Dd09A
NEXT_PUBLIC_PROMPTSEAL_TOKEN_ID=634
NEXT_PUBLIC_PROMPTSEAL_REGISTER_TX_HASH=0x80fb9b4b5548f646a9d27a83d73e357396f971605d56e8f6c541c392aee14e81

# --- Default LLM (overridable per chat) ---
NEXT_PUBLIC_PROMPTSEAL_MODEL=claude-sonnet-4-6
```

`.env.local` is gitignored — these values never get committed.

### What each variable controls

- `NEXT_PUBLIC_PRIVY_APP_ID` — the Privy project the client signs into.
- `NEXT_PUBLIC_PROMPTSEAL_DEMO_WALLET_*` — used by `anchor.ts` to sign
  the self-send tx that anchors the Merkle root.
- `NEXT_PUBLIC_PROMPTSEAL_AGENT_SK` — agent's Ed25519 secret seed.
  Each receipt body is signed with it.
- `NEXT_PUBLIC_PROMPTSEAL_AGENT_PK` — public half, displayed in the
  shield popover header. Should match the on-chain ERC-8004 record.
- `NEXT_PUBLIC_PROMPTSEAL_RPC_URL` / `_CHAIN_ID` — Base Sepolia
  endpoint + chainId. The Next.js CSP `connect-src` already includes
  `https://sepolia.base.org` (see `apps/web/next.config.mjs:185`).
- `NEXT_PUBLIC_PROMPTSEAL_REGISTRY` / `_TOKEN_ID` /
  `_REGISTER_TX_HASH` — ERC-8004 agent registry coordinates. Used by
  the popover header link to Basescan.
- `NEXT_PUBLIC_PROMPTSEAL_MODEL` — fallback model id when the chat's
  Auto picker is on.

---

## 5. Resume fixtures

Create `~/Documents/Promptseal/` and drop the 8 demo resumes there.
The exact JSON content is in `BRANCH_NOTES.md` (and committed under
`/Users/tanmay/Documents/Promptseal/` on the dev box). Each file is a
single object with `id`, `name`, `yoe_react`, `yoe_python`,
`education`, `highlights`, and `expected_decision`
(`"hire"` | `"reject"`).

```
~/Documents/Promptseal/
├── res_001-alice-chen.json     hire     Stanford PhD, Anthropic Staff
├── res_002-bob-martinez.json   reject   bootcamp + customer support
├── res_003-carol-singh.json    reject   UC Davis, Plaid, junior
├── res_004-david-kim.json      hire     Berkeley/CMU, Anthropic
├── res_005-emma-walsh.json     hire     Cornell, Notion senior
├── res_006-frank-liu.json      reject   Caltech, Oracle, 0 React
├── res_007-grace-park.json     hire     CMU/Berkeley, Google L6
└── res_008-henry-wu.json       reject   business degree + Udemy
```

`expected_decision` is read by the agent and used as ground truth —
the score-to-decide steering happens in `prompt.ts`. Strip it from
the file if you want the agent to make its own (less predictable)
call.

---

## 6. Start the dev server

```bash
cd ~/IdeaProjects/jedi2002/ai-memoryless-client/apps/web
pnpm next dev --port 3000 --webpack 2>&1 | tee /tmp/promptseal-dev.log
```

**Why `--webpack`:** Next.js 16's default Turbopack has a
`[locale]` build-manifest race that returns 500s on every page load
in this branch. Webpack mode side-steps it. Tracking issue is in
the Next.js repo; once that lands, `--webpack` can be dropped.

Wait for `✓ Ready in N.Ns`. Logs go to `/tmp/promptseal-dev.log`.

### Health checks

```bash
curl -s -o /dev/null -w "/en  HTTP %{http_code}\n"  http://localhost:3000/en
curl -s -o /dev/null -w "verifier  HTTP %{http_code}\n"  http://localhost:3000/promptseal-verifier/index.html
# Both should return 200.

curl -s -X POST https://sepolia.base.org \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x9718C1CF0C96dde2fb9D820d06785A976972DE2A","latest"],"id":1}'
# Wallet should have > 0.001 ETH for a comfortable session.
```

---

## 7. Drive the demo (manual)

1. Open http://localhost:3000 in Chrome.
2. Sign in with Privy (the test user, or your own — any signed-in
   identity works).
3. **New Chat** in the sidebar.
4. Click the `+` (Attach options) on the composer →
   **Hiring screen (PromptSeal)** tab. The chip
   `Hiring screen (PromptSeal)` should appear above the input.
5. Click `+` again → upload one of the resumes from
   `~/Documents/Promptseal/`.
6. Type `screen resume` → Enter.
7. Wait ~30–60s. The assistant message streams the screening writeup.
8. After streaming, the **shield icon** appears in the action row.
   It walks **grey → blue → green ShieldCheck** within ~10–15s
   (auto-anchor + auto-verify, no clicks needed).
9. Click the green shield → popover with receipts, anchor info,
   verification result, and an **Open Verifier** button.
10. Click *Open Verifier* → static verifier opens in a new tab → click
    *Verify* → **VERIFIED ✓** after ~2s (5-step check, see
    `DEMO_FLOW.md`).

### Tool-less demo

In the same PromptSeal-active chat, type `what is a full stack
developer` (no attachment). After streaming, shield stays **grey**.
Click → popover shows just one **LLM CALL** row, no Anchor /
Verification / Verifier sections. Demonstrates that vanilla chats
don't burn anchor txs.

---

## 8. Run the e2e regression

```bash
cd ~/IdeaProjects/jedi2002/ai-memoryless-client/apps/web
npx playwright test e2e/promptseal-shield.spec.ts --project=chromium --reporter=list
```

Two tests, ~2m 36s total:

- **`uploads 4 resumes, each gets its own anchor + verified shield with distinct proofs`** — uploads 4 JSON files into one chat in sequence, asserts each shield turns green, opens each verifier tab, captures the proof from the URL fragment, and asserts the 4 proofs are pairwise distinct.
- **`non-tool question shows complete-no-tools shield with single LLM CALL row`** — sends `what is a full stack developer`, asserts shield stays grey + clickable, popover shows exactly one LLM CALL row with no anchor / verifier surfaces.

Auth handled by `e2e/auth.setup.ts` (re-uses Privy storage state —
the test user is `test-9758@privy.io`).

The dev server must be running at `:3000` for the test to work.

---

## 9. Reset / restart

### Kill the dev server

```bash
lsof -ti :3000 | xargs kill 2>/dev/null
ps -ef | grep -iE "next-server|next dev" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
sleep 2
lsof -ti :3000 || echo "(port free)"
```

### Wipe the Next cache (only if `[locale]` 500s reappear)

```bash
mv ~/IdeaProjects/jedi2002/ai-memoryless-client/apps/web/.next \
   /tmp/promptseal-next-stale-$(date +%s)
```

### Wipe PromptSeal IndexedDB (start with a clean shield state)

In Chrome DevTools console at `http://localhost:3000`:

```js
indexedDB.deleteDatabase('promptseal'); location.reload();
```

This drops `runs`, `receipts`, `anchors`, `tampered_backups`. Your
on-chain anchor txs are untouched — they live on Base Sepolia, not in
your browser.

### Rebuild SDK after a source change

```bash
cd ~/IdeaProjects/kingpinXD/anuma-sdk
pnpm build
# Client picks up the new dist/ on its next render — Next.js doesn't
# need restarting unless you changed an export the client compiles
# in (e.g. a new symbol).
```

---

## 10. Adjusting the SDK link (non-default layout)

The client's `apps/web/package.json` pins
`"@anuma/sdk": "link:/Users/tanmay/IdeaProjects/kingpinXD/anuma-sdk"`.
That absolute path is hard-coded for the dev box. If you cloned to a
different location, change that line to point at your local path,
then `pnpm install`.

If `pnpm install` complains about not finding the SDK, double-check:

```bash
ls -la ~/IdeaProjects/jedi2002/ai-memoryless-client/apps/web/node_modules/@anuma/sdk
# Should be a symlink to your anuma-sdk path
ls $_/dist/promptseal/index.mjs
# Should resolve
```

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/en` returns 500 with `build-manifest.json ENOENT` | Turbopack `[locale]` race | restart with `--webpack`; see step 6 |
| `Failed to fetch` to `sepolia.base.org` from the browser | CSP `connect-src` missing entry | already included on this branch (`next.config.mjs:185`); reload the dev server after a config change |
| Shield never turns green | Wallet out of ETH | top up via Coinbase faucet; see Prerequisites |
| Shield never turns green, wallet has ETH | Anchor tx silently failing | check DevTools Network for `eth_sendRawTransaction` 4xx; check chain id matches `_CHAIN_ID` env |
| Verifier shows TAMPERED on step 5 | Pre-fix chat (anchored before leaves snapshot landed) | ignore — old anchored runs from before commit `8b1c0f4f` may have proof drift; new runs are fine |
| Shield disappears after page reload | Pre-fix chat (used the old Zustand store) | switch to a chat run after commit `f3fdca6f8` — state now derives from IndexedDB |
| `pnpm install` in the client says SDK not found | The hardcoded `link:` path doesn't match your local layout | edit `apps/web/package.json`; see step 10 |
| Privy login fails in Playwright | `e2e/storage-state.json` stale | delete it; `auth.setup.ts` re-runs and re-logins |

---

## 12. Live anchor history (Base Sepolia)

Demo wallet: `0x9718C1CF0C96dde2fb9D820d06785A976972DE2A`

Older anchors are listed in `BRANCH_NOTES.md`; the cumulative list grows
with every demo run. Search Basescan by `From` address to see them all.
Each tx has 32 bytes in `data` — the SHA-256 Merkle root of that run's
receipts.

---

## Where things live (quick reference)

| What | Path |
|---|---|
| Receipt primitives + chain | `anuma-sdk/src/promptseal/` |
| Hiring agent (tools, prompt, resumes) | `anuma-sdk/src/agents/promptseal/` |
| Static verifier | `anuma-sdk/src/promptseal/verifier/` |
| Shield UI + dropdown | `ai-memoryless-client/apps/web/components/Home/components/PromptSeal*` |
| Lifecycle + state derivation | `ai-memoryless-client/apps/web/hooks/usePromptSeal*` |
| Verifier static mirror | `ai-memoryless-client/apps/web/public/promptseal-verifier/` |
| CSP entry for Base RPC | `ai-memoryless-client/apps/web/next.config.mjs:185` |
| Resume fixtures | `~/Documents/Promptseal/` |
| e2e test | `ai-memoryless-client/apps/web/e2e/promptseal-shield.spec.ts` |

For deeper architecture, see `ARCHITECTURE.md`. For the demo
narrative, see `DEMO_FLOW.md`.
