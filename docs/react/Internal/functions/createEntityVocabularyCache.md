# createEntityVocabularyCache

> **createEntityVocabularyCache**(): [`EntityVocabularyCache`](../interfaces/EntityVocabularyCache.md)

Defined in: src/lib/memory/entityVocabulary.ts:87

Create an empty [EntityVocabularyCache](../interfaces/EntityVocabularyCache.md). Pass it on `RecallContext` to
reuse one built index across every recall in a session; omit it and the index
is rebuilt per call (correct, just wasteful).

## Returns

[`EntityVocabularyCache`](../interfaces/EntityVocabularyCache.md)
