# CHUNKS\_DISCARDED\_ORIGIN

> `const` **CHUNKS\_DISCARDED\_ORIGIN**: `"chunks_discarded"`

Defined in: [src/lib/memoryEngine/embeddings.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#85)

An ordinary message whose chunk vectors were built over `enc:v3:` ciphertext
(sdk#864) and have been discarded instead of re-embedded.

Re-embedding is the obvious repair and is the wrong one: the sweep calls the
embedder with the user's own identity token, so healing these rows would
silently spend a user's own credits — up to ~9k embedding calls on the
worst-hit account — on a background repair nobody asked for (client#5618).
Discarding costs semantic recall on rows whose vectors describe hex, i.e. on
search that is already broken for them.

Deliberately NOT `tool_result`, because that value does two jobs: it
suppresses embedding AND hides the row (`isToolResultsRow` returns true on it
alone, with no content check, and the clients render nothing for such a row).
These are ~2k real user and assistant messages that must keep rendering, so
they need the first job without the second.

Suppression is "never automatically", not "never": `filter.reembedDiscarded`
on either sweep re-opens these rows for an explicit, caller-initiated
re-index. Off by default, so no background pass can spend a user's credits
without being asked to.

That flag opens the gate for one call and nothing more. It does not heal the
row: a message that re-indexes successfully still carries `chunks_discarded`
afterwards, so the next pass skips it again unless that pass sets the flag
too. An embedding-model migration is where this bites. It reaches this gate
before it can do anything, so the repaired rows stay on the old model, and
`searchChunksOp` already drops stale-model vectors — they go quiet with
nothing telling them apart from rows that were never repaired. Clearing the
marker on a successful re-index is the real fix and is tracked separately.

`satisfies MessageOrigin` so the constant and the union cannot drift apart
silently — the column's type is the union, and a typo here would otherwise
only surface as a marker nothing matches.
