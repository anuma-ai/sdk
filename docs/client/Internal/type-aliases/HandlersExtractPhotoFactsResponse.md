# HandlersExtractPhotoFactsResponse

> **HandlersExtractPhotoFactsResponse** = `object`

Defined in: [src/client/types.gen.ts:2296](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2296)

## Properties

### facts?

> `optional` **facts**: `string`\[]

Defined in: [src/client/types.gen.ts:2302](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2302)

Facts is never null — a photo yielding nothing answers \[], which is a valid
outcome (see the prompt), not an error the caller must special-case.
Ordered most-confident-first, as the model emitted them.

***

### filter\_prompt\_sha?

> `optional` **filter\_prompt\_sha**: `string`

Defined in: [src/client/types.gen.ts:2309](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2309)

FilterPromptSHA identifies the red-line FILTER prompt that screened these facts — the second
pinned prompt in the pipeline. Separate from PromptSHA on purpose: the returned facts are shaped
by both, so one combined hash would say something moved while hiding WHICH, and telling an
extraction change from a filter change is the point of recording a sha.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:2318](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2318)

Model is the alias that was used, echoed so the caller can label its own
metrics per anuma-ai/nearby#114 §3.5 without hardcoding the model name.

It is the alias we ASKED FOR, always — deliberately, and it must stay that way. See
ServingProvider below for who answered; the two are different questions and collapsing them
into one field would break both.

***

### prompt\_sha?

> `optional` **prompt\_sha**: `string`

Defined in: [src/client/types.gen.ts:2334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2334)

PromptSHA identifies the extraction prompt that produced these facts — the first 12 hex
characters of its sha256, computed from the prompt this route actually sends (see
photoFactsPromptSHA). It exists so a recorded run can be attributed to a prompt version:
without it a caller comparing two graded runs cannot separate a prompt change from sampling
noise or a provider failover, and the scoring harness had to leave its own
extraction\_prompt\_sha empty rather than hash a local copy that would silently drift from this.

ALWAYS PRESENT, unlike ServingProvider. That field can be genuinely unknown, so its absence
carries meaning; this value is ours and is never unknown, so there is nothing for an omitempty
to express and a missing key would only look like an older portal.

Additive and optional for callers: nearby ignores unknown JSON fields, so recording it there is
a separate change and this needs no coordinated deploy.

***

### serving\_provider?

> `optional` **serving\_provider**: `string`

Defined in: [src/client/types.gen.ts:2350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2350)

ServingProvider is who ACTUALLY answered — "fireworks", "deepinfra" — and it exists because
Model cannot say. The photo alias carries a DeepInfra fallback behind Fireworks
(internal/llmgateway/model\_aliases.go), so from #1565 onward "which provider served this" has a
second possible answer, and a caller comparing runs needs to know which one it got: a result
that changed because the request failed over is a different finding from one that changed
because the prompt did.

EMPTY MEANS UNKNOWN, NOT FIREWORKS. It is populated only when Bifrost reported a provider, and
is never defaulted to the primary — see llmapi.ChatCompletionExtraFields.ServingProvider for
why that distinction has to be preserved rather than smoothed over. Omitted from the JSON when
unknown, so a caller sees absence rather than a confident wrong answer.

Additive and optional: a caller that does not read it is unaffected.

***

### usage?

> `optional` **usage**: [`HandlersExtractPhotoFactsUsage`](HandlersExtractPhotoFactsUsage.md)

Defined in: [src/client/types.gen.ts:2351](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2351)
