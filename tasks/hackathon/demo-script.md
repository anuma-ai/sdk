# Demo Script — Memory Experience Overhaul

**Demo Day:** Friday May 8, 2026 · 9:00 AM PT
**Duration:** 5 minutes hard cap (5:30 with stretch step 6)
**Surface:** web build of `ai-memoryless-client`
**Goal:** show that Anuma's memory now writes itself, retrieves the right things, lets you see and edit what it knows, and stops rotting over time. Headline number: recall@5 X → Y on the 50-pair benchmark.

---

## Pre-demo checklist (Friday 8:00 AM)

- [ ] Reset demo account; pre-seed vault with 5 baseline memories (visible in panel)
- [ ] Stage one near-duplicate fact for the auto-merge moment
- [ ] Stage the climbing-entity test conversation if W5 stretch is in
- [ ] Verify hosted reranker (Fireworks BGE) is responding < 250ms
- [ ] Open: chat window, Memory Studio panel, benchmark dashboard with X/Y numbers, fallback video
- [ ] Two browser tabs ready: `?legacy=true` (cosine-only) and default (hybrid+rerank)
- [ ] Close Slack, email, Notion. Mute. Full screen.

---

## The 5-minute arc

### Step 1 — Problem (45s)

> "Anuma already has memory. The vault stores facts, the engine indexes past conversations. But three things are broken."

- Open vault panel: it's nearly empty after a week of use → **most facts never get saved.**
- In the `?legacy=true` tab: "where do I live now?" — Anuma surfaces "Portland, Oregon" even though a more recent memory says "Relocated from Portland to San Francisco in November 2025." This is the temporal failure: **stale memories outrank fresh ones 28% of the time** on our 100-query benchmark.
- Show the benchmark dashboard: **Overall recall@k 83.8%. Temporal: 72.2%. Composite (multi-fact): 52.1%.**

> "Three problems: it doesn't write itself, retrieval surfaces stale facts, and you can't see or fix what it knows. Let's fix all three."

### Step 2 — Auto-extraction live (90s)

This is the wow moment. Don't rush — let the panel do the work.

- Open the default chat tab (hybrid pipeline on).
- Have a natural-feeling conversation. Suggested script (read it like normal user input, no monotone):

  > "I'm planning a trip to Tokyo in October. My partner Sara has never been. We want to do a cherry blossom thing but I know it's the wrong season — what's good in October?"

- As Anuma replies, **the Memory Studio panel lights up** with three live "remembering…" toasts:
  1. `Trip to Tokyo planned for October 2026`
  2. `Partner's name: Sara`
  3. `Sara has never been to Tokyo`

- Click the second toast. Inspector opens, showing:
  - Source: link back to the exact message
  - Confidence + extraction model
  - Tags: `auto-extracted`, `relationship`

> "Anuma wrote those itself. We didn't tell it to. The async extractor watched the turn, decided what was durable, deduped against what's already in the vault, and saved."

### Step 3 — Hybrid retrieval (60s)

- Switch back to the legacy tab; ask "where do I live now?" → still surfaces `Portland, Oregon`.
- Switch to the default tab; same question → **correctly surfaces `San Francisco`** with the relocation memory cited.
- Hover the cited memory → inspector opens, shows the ranking pipeline:
  - Cosine: 0.61
  - BM25: 0.42
  - Recency boost: ×1.18 (memory is 6 months old vs Portland's 11 months)
  - Reranker (BGE-v2-m3): 0.94 (final)
- Pull up the dashboard: **Temporal recall@k 72.2% → Y%, ranking violations 28% → Z%.**

> "Same query, same vault. Recency catches the staleness. The reranker confirms intent. Composite multi-fact queries lifted too — 52% to W%."

### Step 4 — Auto-merge (45s)

- In the chat, type: "actually Mochi is 4 years old now, not 3."
- Watch the panel: a toast `Updated note about Mochi` appears.
- Click into the dog memory: `proof_count` shows `2`, supersession history shows the prior version. The fact text is the new one, but provenance to both source messages is preserved.

> "The vault used to grow noisier. Now near-duplicates merge instead of pile up, and we keep proof — every time we re-observe a fact, its rank goes up."

### Step 5 — Headline + closer (60s)

- Pull up the benchmark dashboard.
  - Overall recall@k: **83.8% → Y%** (target ≥92%)
  - **Temporal recall@k: 72.2% → Z%** (the headline lift — target ≥95%)
  - **Composite recall@k: 52.1% → W%** (target ≥75%)
  - Ranking violations: **5.0% → near 0**
  - Auto-extraction yield: **N memories per 5 turns** on the eval set, <10% hallucination
  - Latency P50 at `budget: high`: **Q ms**
- Look at the camera.

> "Three concrete shifts: memory writes itself, retrieval surfaces what's actually true today, and the vault stays clean. Every other team's chat demo today benefits from this if it lands. That's our pitch. Thanks."

### Step 6 — STRETCH: Graph traversal (time permitting, ~30s)

Only run if W5 landed and steps 1–5 came in under 4:30.

- "Let me show one more thing the graph lane unlocks."
- Pre-seeded conversation context: 4 separate prior memories where users mentioned `climbing`, `bouldering`, or `Yosemite` for different people.
- Ask: "who's into climbing in our group?"
- Answer pulls all 4, even though only one says the word "climbing" verbatim. Inspector shows entity badges: `climbing`, `bouldering`, `Yosemite` linked through the `memory_entity` table.

> "BM25 wouldn't catch that. Cosine wouldn't catch all of it. Entity overlap does."

---

## Cut-down 3-minute version (if asked to compress)

Drop step 4 (auto-merge) entirely. Compress step 1 to 30s, step 5 to 30s. Steps 2 and 3 stay at full length — they're the spine.

## Fallback if live fails

Pre-recorded screen capture of steps 2 + 3 + 5, narrated. Keep going as if live; resume live for step 4 if pipeline recovers.

## Post-demo Q&A prep

- "How does this compare to Mem0 / MemGPT?" — Two-stage extract→resolve borrows the prior art. Differentiator: Memory Studio panel + provenance back to source chunks; we surface the why, they don't.
- "Does the reranker latency hurt mobile?" — `budget: low` skips rerank. Demo on web uses `budget: high`. Mobile defaults stay conservative.
- "What about ZETA / payments?" — Out of scope this week; deferred to follow-on.
- "Can users opt out?" — Yes, every auto-extracted memory is editable/deletable in the panel. Toggle in settings to disable extraction entirely.
