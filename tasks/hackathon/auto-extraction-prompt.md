# Auto-Extraction Prompt Spec — W2

**Goal:** after each assistant turn, an async pipeline reads the recent conversation, identifies durable facts the user has shared, and writes them to the vault — without the LLM having to call `memory_vault_save` explicitly.

**Acceptance bar (AC2):** ≥1 quality memory per 5 turns on the eval set, <10% hallucination rate.

**Freeze date:** EOD Tue 5/5. Do not re-tune mid-week without reviewing eval set.

---

## Architecture

```
┌─────────────────┐
│  onStepFinish   │ ← chat event stream hook (sdk/src/lib/chat/useChat/types.ts:257)
│  (post-turn)    │
└────────┬────────┘
         │  fires async, never blocks chat
         ▼
┌─────────────────────┐    ┌──────────────────────┐
│  Stage 1: EXTRACT   │ ─▶ │  Stage 2: RESOLVE    │
│  conversation →     │    │  candidate + nearest │
│  candidate facts    │    │  vault → action      │
└─────────────────────┘    └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │ create / merge /     │
                           │ update / skip via    │
                           │ existing operations  │
                           └──────────┬───────────┘
                                      ▼
                           emits `memory_extracted`
                           event → Memory Studio
                           panel toast
```

Both stages run on Haiku 4.5 (fast, cheap, good for structured extraction) via the existing Portal LLM path. Whole pipeline budget: ≤2s per turn, async, fire-and-forget.

---

## Stage 1 — Extract candidate facts

### Inputs

- **Last 6 turns** (3 user + 3 assistant) of the conversation. Trim earlier turns to bound input cost.
- **Conversation summary** if available (skip for hackathon).
- **System prompt** (below).

### Output schema

```json
{
  "candidates": [
    {
      "content": "Partner's name is Sara",
      "type": "relationship",
      "confidence": 0.92,
      "source_message_ids": ["msg_abc123"],
      "entities": ["Sara"]
    }
  ]
}
```

`type` is one of: `identity | preference | relationship | plan | ongoing_context | constraint | other`. `entities` is optional (only used if W5 stretch lands; ignored otherwise).

### System prompt

```
You extract durable user facts from conversations for a personal memory system.

A "durable fact" is something the user shared about themselves that should still be true in future conversations. Examples that ARE durable:
- "Partner's name is Sara"
- "Allergic to shellfish"
- "Working on a Rust side project"
- "Prefers async communication over meetings"
- "Has a golden retriever named Biscuit"
- "Switched from coffee to matcha in September 2025"
- "Lives in San Francisco, moved from Portland in November 2025"

NOT durable — do NOT extract:
- Search queries or questions ("what time does the gym open?")
- Hypothetical scenarios ("if I were to move to Tokyo...")
- Transient state ("I'm hungry", "running late")
- Things the user is asking the assistant to do ("draft an email")
- Facts that are about the assistant or the world, not about the user
- Information already framed as past-tense gossip about other people

For each durable fact, output:
- content: a short, self-contained statement, third-person, present-tense ("Lives in San Francisco" not "I live in San Francisco")
- type: one of identity | preference | relationship | plan | ongoing_context | constraint | other
- confidence: 0.0–1.0; how sure you are this is durable AND true. Only include facts ≥0.7.
- source_message_ids: which message IDs from the conversation contained the evidence
- entities: named entities mentioned (people, places, things). Optional. Skip generic nouns.

If a fact UPDATES a prior state ("I moved to SF in November"), still emit it — the resolver decides what to do.

If no durable facts were shared, return {"candidates": []}. Empty results are fine — most turns won't have any.

Output strict JSON matching the schema. No prose.
```

### User prompt

```
Recent conversation:
{conversation transcript with message IDs prepended to each turn}

Extract durable user facts.
```

### Hallucination guardrails

After Stage 1 returns:
1. **Confidence filter:** drop candidates with `confidence < 0.7`.
2. **Source validation:** drop candidates whose `source_message_ids` reference message IDs not in the input window. (Hallucinated provenance.)
3. **Length filter:** drop `content` longer than 200 chars (a rambling extraction is usually a bad one).
4. **Schema validation:** if JSON parse or schema validation fails, skip the whole turn — don't try to recover partial output.

---

## Stage 2 — Resolve against existing vault

### Inputs

For each surviving Stage-1 candidate, fetch the **top-3 most similar** existing vault memories via the existing `searchVaultMemories` (cosine-only is fine here — this is a fast neighbor lookup, not the demo retrieval path).

### Output schema

```json
{
  "decisions": [
    {
      "candidate_index": 0,
      "action": "create" | "merge" | "update" | "skip",
      "target_id": "vault_memory_xyz" | null,
      "merged_content": "..." | null,
      "rationale": "short reason for telemetry"
    }
  ]
}
```

Action semantics:
- **create**: no good match in vault → write a new memory
- **merge**: candidate is a duplicate or restatement of an existing memory → increment `proof_count` on target, do NOT change content. Used for re-observations of stable facts.
- **update**: candidate is a NEW state of something the vault already has (e.g., "moved to SF" supersedes "lives in Portland") → write `merged_content` to target, increment `proof_count`, keep both `source_chunk_ids`. Triggers the W4 supersession path.
- **skip**: candidate is too trivial, too similar to non-durable existing entries, or extraction was likely wrong on second look

### System prompt

```
You decide what to do with a newly-extracted user fact, given the most similar existing memories in the user's vault.

Choose one action:
- create: the fact is new — no existing memory expresses the same or a related claim
- merge: an existing memory says the same thing already. Do not duplicate; we just record that we saw it again.
- update: an existing memory is now stale, and this fact replaces or amends it (e.g., they moved cities, changed jobs, switched preferences). Write merged_content to capture the new state, preserving any still-true context.
- skip: the fact is trivial, redundant in a way that doesn't need recording, or extraction looks wrong on closer inspection.

Bias toward merge over create when in doubt — vault rot is the bigger failure mode than a missed memory.

For update actions, write merged_content as a short standalone statement reflecting current truth. Do not concatenate; rewrite cleanly.

Output strict JSON. No prose.
```

### User prompt

```
Candidate fact:
  content: "{candidate.content}"
  type: {candidate.type}
  confidence: {candidate.confidence}

Top-3 most similar existing memories:
  [m1] "Lives in Portland, Oregon"             (similarity 0.71, created 2025-06-01)
  [m2] "Relocated from Portland to San Francisco in November 2025"  (similarity 0.68, created 2025-11-15)
  [m3] "Prefers async communication"           (similarity 0.22, created 2025-12-01)

Decide.
```

---

## Eval plan

20 hand-curated conversations under `sdk/test/memory/src/extraction/conversations/`. Each conversation has:
- 4–8 turns of realistic chat
- A ground-truth list of facts that SHOULD be extracted
- A ground-truth list of facts that should NOT be extracted (negative examples)

Metrics:
- **Yield**: extracted-and-kept facts ÷ ground-truth durable facts. Target ≥0.6 (we'd rather miss than hallucinate).
- **Precision**: extracted-and-kept facts that are correct ÷ all extracted facts. Target ≥0.9 (the hallucination ceiling).
- **Per-5-turn yield**: the AC2 bar. ≥1.

Run via `pnpm eval:auto-extraction` (new script — mirrors `eval:vault-search` shape). Output a single-line summary; full JSON to `extraction-baseline.json` for regression tracking.

---

## Failure modes + how the prompt handles them

| Failure | Mitigation |
|---|---|
| LLM extracts the user's question as a fact ("user wondered what time the gym opens") | System prompt explicitly excludes search queries / questions |
| LLM extracts assistant outputs as user facts | System prompt: "facts the user shared", source_message_ids must reference user turns |
| LLM hallucinates `source_message_ids` | Stage-1 post-validation drops candidates with unknown IDs |
| LLM emits long meandering "facts" | 200-char `content` cap |
| LLM creates duplicates ("user is allergic to shellfish" added every turn the user mentions food) | Stage 2 resolver biases toward `merge` |
| Resolver picks `update` when it should be `create` (different topic, accidentally similar embedding) | Top-3 similar input includes similarity scores so resolver can see weak matches; prompt says "no existing memory expresses the same or a related claim" |
| Whole pipeline fails mid-conversation | Async + fire-and-forget; chat is never blocked. Errors logged but not surfaced to user. |
| Cost runaway | Hard rate limit: ≤1 extraction call per assistant turn. Skip if previous extraction is still pending. |

---

## Open questions to revisit Tue 5/5

1. **Should we run extraction on EVERY turn, or only when the user message looks fact-bearing?** Cheap heuristic prefilter (length, presence of personal pronouns) could halve the call volume. Defer until we have eval data.
2. **Do we extract from the assistant's response too?** The assistant might restate or confirm a fact ("Got it, I'll remember Sara is your partner"). For hackathon: user turns only — simpler, easier to attribute.
3. **Conversation summary as additional context?** Likely unnecessary at 6-turn windows; reconsider if recall on long conversations is poor.

---

## Implementation hook points (resolved from Explore findings)

- **Trigger:** `onStepFinish` callback in `sdk/src/lib/chat/useChat/types.ts:257`
- **Vault write:** `createVaultMemoryOp` / `updateVaultMemoryOp` in `sdk/src/lib/db/memoryVault/operations.ts` (existing functions; add a `source: "auto-extracted"` and `source_chunk_ids` parameter)
- **Embedding:** `generateEmbedding` from `sdk/src/lib/memoryEngine/embeddings.ts` (use Portal API key path for server-side eval, Privy token for client runtime)
- **LLM call:** Portal chat completion with Haiku 4.5; structured-output mode (JSON schema) if available, else strict prompt + post-parse
- **Event emission:** new `onMemoryExtracted` callback added to chat options shape; emit after successful write so the Memory Studio panel can subscribe
