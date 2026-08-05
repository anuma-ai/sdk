# FACET\_SLOTS

> `const` **FACET\_SLOTS**: readonly \[`"ui_theme"`, `"residence"`, `"employer"`, `"job_title"`, `"diet"`, `"relationship_status"`, `"communication_style"`]

Defined in: [src/lib/db/memoryVault/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#35)

Closed enum of single-valued SELF facet slots (facet slot+value supersede).

A "facet" is a standing attribute of the user that holds exactly ONE current
value at a time (unlike list-valued facts like allergies, or dated events).
Each facet carries a slot key plus a normalized VALUE token, recorded on the
memory for consumers that want to read a fact's slot and current value.

NOT a dedup mechanism: retain() stamps these on create and otherwise ignores
them — every write is deduped by semantic search + the decide model.

Deliberately NARROW to start. Anything outside this set → no facet (null), and
the memory simply carries no slot/value. SUBJECT is SELF-ONLY in this
increment (a non-self subject → null), so a facet key is always
`"<factType>:self:<slot>"`, e.g. `preference:self:ui_theme`.
