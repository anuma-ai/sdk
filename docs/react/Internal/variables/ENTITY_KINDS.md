# ENTITY\_KINDS

> `const` **ENTITY\_KINDS**: readonly \[`"person"`, `"place"`, `"thing"`, `"concept"`, `"other"`]

Defined in: [src/lib/db/entities/types.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/entities/types.ts#7)

The recognized entity classifications. Runtime list + derived type kept
in one place so the extractor's validation and the `EntityKind` union
can't drift apart.
