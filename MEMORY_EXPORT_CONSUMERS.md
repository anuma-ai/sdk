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
| `synthesizeProfile` | dark | #768 C3. 792 lines described as launch-critical for People Nearby, exported from all three barrels, called by nobody. Tracked by the C1 profile-synthesis plan in #719. |
| `reflect` | dark | Dark with `synthesizeProfile` — its only caller. |
| `summarizeObservationTrends` | dark | Same subtree — consumed only by `synthesizeProfile` and `profileSalience`. |
| `rankProfileCandidates` | dark | Same subtree — profile-salience ranking for `synthesizeProfile`. |
| `scoreProfileSalience` | dark | Same subtree — per-candidate half of that salience pass. |
