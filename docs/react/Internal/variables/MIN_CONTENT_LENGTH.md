# MIN\_CONTENT\_LENGTH

> `const` **MIN\_CONTENT\_LENGTH**: `3` = `3`

Defined in: [src/lib/memory/junkGate.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/junkGate.ts#27)

Minimum normalized length (after trimming and stripping trailing `.!?`)
for a Latin/other-script memory to be considered durable. Shared with the
auto-extraction gate (via [isJunkMemoryContent](../functions/isJunkMemoryContent.md)) so the tool and the
extractor reject identically. CJK content uses a lower floor (see below).
