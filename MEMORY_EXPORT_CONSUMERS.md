# Memory export consumers

Every value export of the memory barrels (`src/lib/memory`, `src/lib/memoryVault`)
that **nothing inside this repo calls**. Their only possible caller is a client
app in another repo, so from here a live feature and dead code look identical —
that is how the durable extraction cursor, the LLM injection classifier and
`synthesizeProfile` all shipped and stayed dark (anuma-ai/sdk#768 C1–C3).

`pnpm check:export-consumers` computes the list and fails on an undeclared or
stale one, so adding a public memory export forces a line in a reviewed diff
saying who calls it. Scoped to the memory barrels for now; the same failure mode
exists elsewhere and the scope can widen once this stays green.

**This file is a declaration, not a proof.** Nothing here verifies that the
client really calls what a row claims. Keep it honest: when you unmount
something on the client side, come back and change the row.

It has already gone stale in the more dangerous direction. On 2026-07-31 three
rows still read `dark` for exports the client had been calling for days
(`synthesizeProfile`, `rankProfileCandidates`, `scoreProfileSalience`), and an
audit reading this file concluded the launch-critical profile path was unmounted.
A row saying `dark` is a lead to verify against the client tree, never evidence.

Two limits worth knowing before trusting a green run:

1. The check scopes "client-facing" to the memory barrels (`src/lib/memory`,
   `src/lib/memoryVault`), NOT to the package entry points. An export that never
   reaches `react`/`expo`/`server` still gets a row and still passes — which is
   exactly how `verifyMemoriesForPublish` sat here as a declared export that no
   client could import.
2. Liveness is "some live module imports it", propagated to a fixpoint. A symbol
   called only from a branch no client configuration can reach counts as live —
   see `createLlmNeighborRefiner`, reachable solely at `budget: 'high'`, which no
   client passes. Tracked in anuma-ai/sdk#844 §4.

| Status           | Meaning                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `client-mounted` | A client app calls it — the note names the file. Also marks the internals it pulls in as live, so they aren't reported twice.      |
| `public-utility` | Deliberately callable with no in-repo caller (a probe, a catalog, a direct-call alternative to the hook). Implies nothing runs it. |
| `dark`           | Nothing calls it. The note says why, and links the tracking issue where one exists.                                               |

Client paths are in `zeta-chain/ai-memoryless-client`.

| Export | Status | Consumer / why it is dark |
| --- | --- | --- |
| `createAutoExtractor` | client-mounted | `packages/hooks/src/useAutoExtraction.ts` — the shared `useAutoExtractionCore`, wrapped by both `apps/web` and `apps/mobile`. The only extraction entry point either app uses. |
| `extractAndLinkEntitiesForMemoriesOp` | client-mounted | `packages/hooks/src/useTopicExtractionWorker.ts` — the background topic sweep (mobile mounts it from `app/(auth)/chat.tsx`). |
| `createDecaySweeper` | client-mounted | `apps/web/hooks/useMemoryDecay.ts:51` and `apps/mobile/hooks/useMemoryDecay.ts:72`, both through `packages/hooks/src/useMemoryDecay.ts` (hosts: `MemoryDecayHost.tsx:21`, `app/(auth)/_layout.tsx:163`). |
| `extractFacts` | public-utility | Direct-call extractor, re-exported by the client's own barrel (`packages/hooks/src/autoExtract/index.ts`) and exercised by web e2e. The chat path itself goes through `createAutoExtractor`. |
| `extractEntitiesForMemories` | public-utility | Lower-level batch form of `extractAndLinkEntitiesForMemoriesOp`; the client uses the `…Op` wrapper, which also persists the links. |
| `isRerankerAvailable` | public-utility | Capability probe for consumers that want to disclose "rerank unavailable". `recall()` already degrades on its own, so nothing has to call this. |
| `injectionSignatureCatalog` | public-utility | The Tier-0 signature list, exported for security review and for a consumer that wants to screen its own input. The screen itself runs inside `extractAndRetain`. |
| `ttlForType` | public-utility | Per-fact-type TTL lookup, exported so a consumer can render "expires in N days". The sweep path reaches it inside `classifyDecay` (same module, no import), so nothing external has to call it. |
| `capHopsForDensity` | public-utility | Exported for tuning/inspection of the graph-lane hop cap; the cap is applied inside `traverseGraphLane` (`graphTraversal.ts:201`), which recall calls. |
| `createPlatformCursorStore` | client-mounted | #768 C1. Web only: `apps/web/hooks/useAutoExtraction.ts:80` over `webPlatformStorage`, passed to `createAutoExtractor` at `:105`. Mobile implements `ExtractionCursorStore` itself (RN has no sync storage, and it owns the key prefix for its hydration scan), so it takes the type and not this factory — see zeta-chain/ai-memoryless-client#5221. |
| `createLlmDecayClassifier` | dark | The sweeper is mounted but neither client passes a `classifier`, so decay is deterministic-TTL only. Enabling it means per-sweep LLM cost and needs an eval first. |
| `synthesizeProfile` | client-mounted | #768 C3, mounted 2026-07 on BOTH platforms: `apps/web/hooks/useSuggestNearbyProfile.ts:101` and `apps/mobile/hooks/useSuggestNearbyProfile.ts:128`, each gating on the published set via `getAllVaultMemoriesOp(ctx, { visibility: ['public'] })` → `reviewedMemoryIds`. This row said `dark` until 2026-07-31 and misdirected an audit — see the header note. |
| `rankProfileCandidates` | client-mounted | `packages/hooks/src/promptCoverage/computeCoverage.ts:359`, injected structurally as `ProfileRankFn` (see `promptCoverage/salience.ts`). Was `dark` until 2026-07-31. |
| `scoreProfileSalience` | client-mounted | `packages/hooks/src/promptCoverage/computeCoverage.ts:345`. Was `dark` until 2026-07-31. |
| `verifyMemoriesForPublish` | dark | #707. The publish-time support check for People Nearby. Deliberately NOT wired into `setMemoryVisibilityOp` (that op is offline storage and also the revoke path — a verdict there would gate taking a memory DOWN on an LLM being reachable). Until 2026-07-31 it was not exported from `react`/`expo`/`server` at all, so no client could call it whatever it wanted; those exports are added here. Goes live with the client gate in zeta-chain/ai-memoryless-client#5440. |
| `isDegradedTopicSkip` | dark | Classifies a `TopicSkipReason` as "the sweep broke" vs "the sweep deliberately declined". Exported so callers can't each re-derive that split — one wrong grouping turns a wholly failed sweep back into a healthy-looking one. Dark until the client emits topic-sweep telemetry; goes live with that wiring. |
| `createMessageSourceResolver` | dark | Dark with `verifyMemoriesForPublish` — the default `VerificationSources` wiring over the chat store. Same missing-barrel-export history as that row. |

## Config-level knobs

The table above proves an export is *imported* by a live module. It is blind, by
construction, to a symbol that is imported and then called from a branch **no
client configuration reaches** — the fixpoint counts the dead branch's import as
consumption. That blind spot is how `budget: 'high'` (multi-hop graph traversal,
LLM query decomposition, the neighbor refiner) and `options.mmr` stayed
unreachable in production for months while `pnpm check:export-consumers` printed
green, and it is limit 2 in the header.

So the knobs that gate a ranking branch get declared here too, same statuses,
`config:` prefix. Two things this buys that the export table alone does not:

- **A new `Budget` tier fails the gate until someone declares it.** The tier list
  is derived from `export type Budget` in `src/lib/memory/types.ts`, not written
  here, so it cannot drift. `high` shipped as the only tier enabling traversal and
  was never selectable by any client; the next tier cannot repeat that silently.
- **A renamed knob fails instead of quietly un-covering itself.** Each knob names
  the file and token where it is read, and the gate asserts the token still
  exists.

**What this does NOT do:** this repo cannot see the client tree, so it cannot
verify a call site — exactly the limit the header states for the export table. It
forces a declaration in a reviewed diff, nothing more. A real call-site check
needs both trees at once; the natural home is
`.github/workflows/integration-check.yml`, which already clones the client. Until
that exists, a `client-mounted` row here is a lead to verify, never evidence.

| Knob                 | Status         | Where                                                                                                                              |
| -------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `config:budget=low`  | client-mounted | `DEFAULT_BUDGET` in `recallTool.ts:34`, so every `createRecallTool` caller that passes no budget lands here — and web's does not (`apps/web/hooks/useChatTools.tsx`). Also the documented mobile default. |
| `config:budget=mid`  | client-mounted | Web's per-turn injection path once the cross-encoder is warm: `apps/web/hooks/useChatSetup.tsx:300`, with the reranker repo pinned in `apps/web/worker.ts:1053` and preloaded by `useBackgroundRerankerPreload.ts`. |
| `config:budget=high` | dark           | #844 §1. **Zero client call sites** — an exhaustive search of `apps` + `packages` for a `'high'` budget literal returns nothing, re-verified 2026-08-11. `flagsForBudget` (`recall.ts:77`) makes `high` the only tier with `traverse: true`, so `graphTraversal.ts` (436 LOC), `capHopsForDensity`, `createLlmNeighborRefiner` and the composite `rankComposite` path cannot execute in production. Decide: mount it or delete it. |
| `config:mmr`         | dark           | #844 §2. Zero client references (a case-insensitive search for `mmr` across the client returns nothing). **Measured 2026-08-11** on `eval:vault-search --ranker fused`: MMR is below the no-MMR control at every λ (recall@k 0.835 → 0.812 at the 0.7 default, 0.727 at λ=0.3), and improves monotonically as λ→1, i.e. as it diversifies less. Recommendation on the issue is to keep it dark rather than arm it. |
| `config:graphRefine` | dark           | Gated behind `flags.traverse && options.graphRefine && options.decomposeOptions` (`recall.ts:243`), so it is unreachable for as long as `config:budget=high` is. `createLlmNeighborRefiner` is exported from all four barrels with no client consumer. |
| `config:subQueries`  | dark           | 719/B4 moved decomposition to the tool layer, which computes `subQueries` only at `budget: 'high'` (`recallTool.ts`). No client passes `subQueries` or `decomposeOptions` directly either — verified 2026-08-11 — so the composite multi-facet ranker never runs. |
| `config:rerank`      | client-mounted | Not passed explicitly by any client; reached via `config:budget=mid`, which `flagsForBudget` maps to `{ rerank: true }` (documented at `packages/hooks/src/memoryRecall/config.ts:63`). Listed so that decoupling rerank from the budget tiers cannot silently strand it. |
