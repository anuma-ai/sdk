# Reliable extraction and shared context assembly

`createDurableAutoExtractor` is the client extraction entry point. Create one
per authenticated database session and dispose it when the session or privacy
mode changes. It requires the SDK v46 schema and models.

- Accepted turns enqueue source message IDs in `memory_extraction_jobs`, a
  device-local outbox. Plaintext message snapshots are never stored there.
- Initial extraction keeps the legacy six-message window unless `windowSize`
  overrides it. A legacy cursor resumes all subsequent messages. Scope changes
  do not enqueue previously observed or pending private sources again.
- Extraction reads encrypted history in batches of 20, with two overlapping
  messages for context. Pending batches resume when the worker is created.
- Partial retention and unavailable or locked sources remain pending. Failed
  jobs retry up to three times per worker session, then wait for a new turn or
  the next worker session. This is not an operating-system background service.
- Source deletion and worker disposal prevent late writes. Message clearing
  and `deleteMessageOp` prune the outbox; callers deleting messages should use
  these operations instead of destroying history rows directly.
- Replaying already-observed source IDs does not increment proof count or
  refresh a fact. Decay considers `lastObservedAt` and checks it again before
  archiving.

`assembleMemoryContext` and `shouldRecallMemory` are available from the pure
`@anuma/sdk/memory/context` entry point, as well as the existing SDK entry
points. The pure entry has no runtime React, native, or database imports.

```ts
import { assembleMemoryContext } from "@anuma/sdk/memory/context";

const result = await assembleMemoryContext({
  query,
  recall: storage.recall,
  loadFacts: storage.getVaultMemories,
  loadSessionRefs,
  memoryIds: topicMemoryIds, // undefined: all; []: none
  recallOptions: { budget: "low", excludeConversationId: conversationId },
});
```

The assembler combines bounded typed profile facts, ranked facts, conversation
excerpts, and prior-turn facts. It deduplicates the result and applies a 12,000
character content budget; callers still own prompt formatting and instruction
isolation. The `recalled` flag preserves ranked evidence when the profile lane
already included the same fact, so clients can display its actual recall score.

Topic membership filters every fact lane before ranking. Excerpts are disabled
for topic, folder, or scope-restricted assembly until they have equivalent
membership filtering. Query length and whitespace are not eligibility gates;
only empty input and exact trivial acknowledgments skip ranking. Failures are
reported per lane and never trigger an arbitrary whole-vault dump.

Release the SDK first, then update the client's SDK pin before merging the
client integration. Local validation uses a filesystem SDK override; that
override is development wiring, not a publishable dependency.
