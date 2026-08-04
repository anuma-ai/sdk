# TOPICS\_EXTRACTION\_VERSION

> `const` **TOPICS\_EXTRACTION\_VERSION**: `3` = `3`

Defined in: [src/lib/db/memoryVault/operations.ts:1472](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#1472)

The current topic-extraction logic version. Bump this whenever the extraction
prompt or model in `topicExtract.ts` changes: every memory stamped under an
older version (including pre-v37 rows, read as version 0) is then re-extracted
by the next sweep, so topic-quality improvements propagate across the existing
vault. The worker's `limit` drains that re-extraction across sweeps.

Bumping this is a WHOLE-VAULT re-extraction: the gate is unconditional across
every stamped row, and `stampTopicsExtractedAtOp` stamps this version on every
healthy row, so a bump sends each user's entire extracted vault back to the
LLM. Never reach for it to repair a subset — see the pre-v42-restore repair in
[getMemoriesNeedingTopicExtractionOp](../functions/getMemoriesNeedingTopicExtractionOp.md), which targets the damaged rows.
