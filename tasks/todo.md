# Plan: In-memory watermark + coalescing queue for auto-extraction

## Problem
`autoExtractWorker.ts` drops turns that arrive while an extraction is in-flight
(`:197-200`) and only ever extracts a fixed trailing `slice(-windowSize)`
(`:202`). Under a burst of quick turns, a durable fact stated in a dropped turn
scrolls out of the last-N window before the next extraction runs → permanently
lost, silently. The same turn can also be re-extracted (no progress marker) →
duplicate memories below the 0.85 cosine merge floor.

## Approach (in-memory only — no schema, no DB)
1. **In-memory watermark**: `Map<conversationId, lastExtractedMessageId>` in the
   worker closure. Advances to the last examined message on successful
   completion (NOT on throw → transient failures get re-covered next turn).
2. **Window-widening**: instead of `slice(-windowSize)`, send everything after
   the watermark (+ small overlap for coreference), capped at `maxWindowSize`.
   Falls back to `slice(-windowSize)` when there's no watermark yet or it
   scrolled out of the provided history.
3. **Coalescing queue**: replace drop-on-busy with a single-slot pending turn.
   A turn arriving while in-flight is queued; a newer turn supersedes the
   pending one. Lossless because the watermark only advances on completion, so
   the newest pending's (superset) message list re-covers any superseded turn.

## Files
| File | Change |
|---|---|
| `src/lib/memory/autoExtractWorker.ts` | watermark Map, computeWindow, coalescing queue, new skip reasons, docs |
| `src/lib/memory/autoExtractWorker.test.ts` | update in-flight test (now queues), add watermark/widening/coalesce/dedup tests |

## Acceptance criteria
- [ ] AC1 Burst: turn A in-flight, turns B then C arrive → A runs; after A, C
      runs on a window covering B+C's new messages (B not lost). Assert via
      `extractAndRetain` mock call args.
- [ ] AC2 No-new-content: processTurn called twice for the same final state →
      second is skipped (`reason:"no-new-content"`), `extractAndRetain` called once.
- [ ] AC3 Widening: watermark at m_k, new messages m_{k+1..} → window starts at
      `m_{k+1 - overlap}` and includes all new messages (not just last N).
- [ ] AC4 maxWindowSize cap: widened window > cap → truncated to most recent
      `maxWindowSize`, warn logged.
- [ ] AC5 Watermark NOT advanced on throw → next turn re-covers the same window.
- [ ] AC6 Superseded pending fires `onSkipped({reason:"superseded"})`; its
      content still extracted by the next run.
- [ ] AC7 Back-compat: no-watermark first call still equals `slice(-windowSize)`;
      `dispose()` still stops new turns and drops any pending; existing tests pass.
- [ ] AC8 `pnpm build` + `pnpm test` for the memory suite green; no type errors.

## Review (done)
- All AC1–AC8 met. 20 worker tests + 230 memory-suite tests green; `tsc --noEmit`
  clean; eslint clean; typedoc/schema docs regenerated (CI `generated.yml` gate).
- Fresh-eyes evaluator found one real bug: the pending slot was conversation-
  blind, so a queued turn for conv A was silently dropped when a turn for conv B
  arrived mid-flight (reintroduced cross-conversation loss). **Fixed**: pending
  is now a per-conversation `Map`, draining one at a time (≤1 in-flight). Added
  same-conversation supersession + multi-conversation no-drop tests.
- Evaluator LOW notes accepted as-is: watermark/pending `Map` growth is bounded
  by conversations touched in a session (worker is session-scoped, disposed per
  session); a late `onMemoryExtracted` after `dispose()` for already-in-flight
  work is documented behavior ("in-flight work continues").

## Out of scope (separate follow-ups)
- Cross-process durability (persisted watermark → needs WatermelonDB migration)
- H2 scope-symmetric dedup, H3 exhausted-empty outcome signal, H4 keep-facts-with-
  bad-source-ids, M2 PII auto-mask, M4 delete-race guard
