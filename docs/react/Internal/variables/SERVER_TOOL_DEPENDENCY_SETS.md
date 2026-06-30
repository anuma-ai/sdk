# SERVER\_TOOL\_DEPENDENCY\_SETS

> `const` **SERVER\_TOOL\_DEPENDENCY\_SETS**: [`ToolSet`](../interfaces/ToolSet.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1435](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1435)

Dependency edges between server tools: when an entry tool (anchor) matches
a prompt, its continuation tools ride in even though they can never match
the prompt themselves.

These exist because semantic selection structurally cannot reach a tool
whose job is step 2 of a call-chain. Measured against the live catalog
(June 2026): on "research the latest news on X", `search_web` scores 0.64
but `parallel_read_url` scores 0.33 and `parallel_search_web` 0.47 — below
the 0.5 floor, unreachable at ANY match limit. Likewise a Fal generation
prompt scores `fal_generate_video` 0.85 while the queue lifecycle it
depends on scores 0.25–0.41. No threshold or limit tuning fixes this; an
explicit edge is the only mechanism that does.

Deliberately NOT grouped: same-vendor siblings (`extract_pdf`,
`search_images`, weather/finance variants, Fal discovery tools…). Those
embed near the prompts that need them and survive plain top-5 selection on
their own — vendor-wide expansion just dilutes the toolset. Keep this list
to genuine call-chains.

Tool names are EXACT `/api/v1/tools` catalog matches — all filtering in
this module is exact-string, so a stale name silently selects nothing (the
May 2026 `Anuma` prefix rename broke every consumer keeping copies of
these lists). The toolSelection e2e suite asserts every name below exists
in the live catalog.
