# TOPICS\_EXTRACTION\_VERSION

> `const` **TOPICS\_EXTRACTION\_VERSION**: `1` = `1`

Defined in: [src/lib/db/memoryVault/operations.ts:858](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#858)

The current topic-extraction logic version. Bump this whenever the extraction
prompt or model in `topicExtract.ts` changes: every memory stamped under an
older version (including pre-v37 rows, read as version 0) is then re-extracted
by the next sweep, so topic-quality improvements propagate across the existing
vault. The worker's `limit` drains that re-extraction across sweeps.
