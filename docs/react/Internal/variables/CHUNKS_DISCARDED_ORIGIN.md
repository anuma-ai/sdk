# CHUNKS\_DISCARDED\_ORIGIN

> `const` **CHUNKS\_DISCARDED\_ORIGIN**: `"chunks_discarded"` = `"chunks_discarded"`

Defined in: [src/lib/memoryEngine/embeddings.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryEngine/embeddings.ts#67)

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
