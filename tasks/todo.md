# Memory Experience Overhaul — Hackathon Plan

**Canonical doc:** https://www.notion.so/3567b3fb90498087b0e1d823139fa4cc
**Track:** Anuma Chat · **Dates:** May 4–8, 2026 · **Demo:** Fri 5/8, 9:00 AM PT (web)

This file is the working tracker. Update checkboxes as work progresses; mirror big decisions back to the Notion doc's Decision Log.

## Must-keeps (cut order: W4 → proof_count UI → rerank stage)

- W1: Hybrid retrieval + reranking
- W2: Auto-extraction
- W3: Memory Studio panel
- W4: Auto-merge / dedup *(first to cut)*
- **W5: Knowledge-graph traversal (stretch)** — only pulled in if core lands clean by Wed

## Acceptance criteria

- [x] AC1 — Recall@5 ≥30% lift over cosine-only baseline
      _**Locked headline (commit `9ecf160`): claude-sonnet-4-6 oracle 90.3%** (261/289); vs current main 73.0% → **+17.3pp / +50 correct** (run 25453897521)._
      _Pipeline: unified `recall()` API (commit `0126d43`, 87.5%) → K=7 + excerpt-3500 + fact-14 (commit `1e4ef9c`, 89.6%) → chunk-source 6000→12000 + excerpt-cap 3500→8000 (commit `9ecf160`, **90.3%**). Diagnostic on the 76.8% single-session-assistant bucket showed B-truncation: assistant turns containing the answer routinely sat past the 3500-char excerpt window (Admon shift table truncated mid-word; Catalan singer answer literally "cut off before [the answer] was named"). Bumping the truncation caps lifted SSA to 87.5% (+10.7pp / +6q) at the cost of small dips on multi-session (-3q) and preference (-2q), within plausible variance on those bucket sizes._
      _Two follow-up sweeps confirmed sweep #1 is the right operating point: sweep #2 (chunk-source unchanged at 6000, excerpt-cap=6000) hurt multi-session badly (-11q, source-side clipping) — 88.6%; sweep #3 (chunk-source=12000, excerpt-cap=5500) didn't recover MS — 89.3% — confirming the MS dip isn't context bloat._
      _Saturation reached: routing-prompt (-2q), CE-on-chunks (-3q), and fact-limit 14→18 (-9q) experiments each regressed and were reverted. 90.3% is the practical ceiling for the current pipeline shape on Claude Sonnet 4.6._
      _kimi-k2p5 oracle: 75.4% (run 25403718559); vs March 11 baseline 70.9% → +4.5pp._
- [ ] AC2 — ≥1 quality memory per 5 turns; <10% hallucination
- [ ] AC3 — Memory Studio shows toast + breakdown + edit/delete (E2E)
- [ ] AC4 — Near-dupe inserts merge + increment proof_count
- [x] AC5 — Hybrid retrieval P50 ≤300ms on 1k-memory fixture (P50 99ms with V2+CE)

## Mon 5/4 — Demo script + scaffolding

- [ ] Lock 5-min demo script
- [ ] Build recall@5 benchmark fixture (~50 pairs across 5 categories)
- [ ] Spec auto-extraction prompt (two-stage: extract → resolve)
- [ ] Add SQLite FTS5 index in memoryEngine + memoryVault
- [ ] Schema migration: source_chunk_ids, proof_count, source (nullable, additive)
- [ ] Run baseline benchmark against current cosine

## Tue 5/5 — Retrieval core

- [ ] RRF fusion (k=60) in searchVaultMemories + searchChunksOp
- [ ] Hosted reranker (BGE-v2-m3 via Fireworks, Cohere fallback) behind `budget` param
- [ ] Recency boost (linear 365d, α=0.2)
- [ ] max_tokens + greedy truncation (replaces `limit`)
- [ ] Run benchmark — confirm lift
- [ ] Freeze auto-extraction prompt

## Wed 5/6 — Auto-extraction + dedup (standup check-in)

- [ ] Async post-turn extraction worker
- [ ] Resolve-against-existing (merge / new / skip)
- [ ] Auto-merge on insert (cosine >0.85)
- [ ] proof_count boost in ranking (α=0.1 log curve)
- [ ] Extraction events on chat event stream
- [ ] Standup demo via curl / minimal UI

## Thu 5/7 — Memory Studio panel (web)

- [ ] Sidebar component in ai-memoryless-client
- [ ] Live extraction toast
- [ ] Memory list (edit / delete)
- [ ] Per-memory inspector (sources, scores, proof_count)
- [ ] Hover-card on cited memories in assistant answers
- [ ] Wire search_memory + memory_vault_search to new pipeline
- [ ] E2E on three demo moments (data-testid, no waitForTimeout)

## Fri 5/8 — Demo day

- [ ] Dry runs ×3
- [ ] Record fallback video
- [ ] Final benchmark run (headline number)
- [ ] Demo at 9:00 AM PT

## Stretch — W5 Knowledge-graph traversal

Pull in Thu PM if core is clean. Adds 4th TEMPR retrieval lane. Drop entirely without ceremony if blocked.

- [ ] Extend W2 prompt to emit named entities alongside facts
- [ ] Schema: `entity` + `memory_entity` tables
- [ ] Wire entities into auto-extraction worker (write rows on save/merge)
- [ ] Graph candidate set: query-entity extraction → memories with shared entities → tanh(shared/total) score
- [ ] Add graph lane to RRF fusion (BM25 + cosine + graph → reranker)
- [ ] Entity badges in Memory Studio inspector
- [ ] Pick demo question with a clear graph-only win (e.g., "who's into climbing?")

## Open questions

_All resolved 2026-05-04. Solo + agents, web demo, hosted reranker, KG as stretch._

## Lessons / decisions during the week

(Append as we go. Mirror anything load-bearing back to the Notion Decision Log.)

### 2026-05-04 — Pivot to API unification (Recall / Retain)

User asked to lead with unification rather than two-store improvements. The pivot:
- New module `sdk/src/lib/memory/` with `recall()` + `retain()` as the public surface
- Storage stays separate (vault + chunks tables) — unification is at the API layer
- Legacy functions become thin wrappers; zero call-site churn
- W1–W4 land *inside* `recall()` / `retain()` instead of in two parallel paths
- Demo narrative: "from two memory systems to one"

Skeleton shipped Mon: types, recall delegation, BM25 module ready to plug in Tue.

### 2026-05-04 — Implementation location: SDK + web client (not new server-side)

Explore findings flipped the call:
- No FTS5 today — search is in-memory cosine, so BM25 stays in-memory TS (no WatermelonDB-on-web blocker)
- `pnpm eval:vault-search` benchmark with recall@k/MRR/NDCG already exists at `sdk/test/memory/src/vault/benchmark.test.ts`
- Wallet-encrypted on-device privacy preserved
- Mobile parity comes for free post-hackathon

**Where things live:**
- W1 hybrid retrieval → `sdk/src/lib/memoryVault/searchTool.ts` + `sdk/src/lib/memoryEngine/tool.ts`
- W2 auto-extraction worker → hooked on `onStepFinish` in `sdk/src/lib/chat/useChat/types.ts:257`; LLM call via Portal; writes through existing `createVaultMemoryOp`/`updateVaultMemoryOp`
- W3 Memory Studio panel → `ai-memoryless-client/apps/web/components/Home/components/MemoryStudioPanel.tsx`
- W4 auto-merge → `sdk/src/lib/db/memoryVault/operations.ts` (between confirmation and write)
- W5 entity graph (stretch) → new `entity` + `memory_entity` tables in `sdk/src/lib/db/schema.ts` migration v29
- Schema migration v28: `source_chunk_ids`, `proof_count`, `source` (additive nullable) — mirrors v21 embedding pattern
- Benchmark: extend existing `benchmark.test.ts`; fixtures in `sdk/scripts/memory-bench/fixtures/recall.json`
