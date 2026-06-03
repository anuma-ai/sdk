# ToolSet

Defined in: [src/lib/tools/serverTools.ts:812](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#812)

A tool set defines a group of tools that work together. When any "anchor"
tool in the set is matched semantically (with a score at or above
`anchorMinSimilarity`), the set is activated and all of its members are
pulled into the selection.

Two activation strategies consume this interface:

* `expandToolSetsAdditive` (used by `useChatStorage` and
  `createServerToolsFilter`) keeps all original matches and adds the
  set's members on top — non-set tools are never dropped.
* `applyToolSets` is exclusive: it keeps only set members plus non-set
  tools that scored above `independentThreshold`.

Pick `expandToolSetsAdditive` when you want recall over precision
(typical), and `applyToolSets` when you specifically want non-set
matches stripped on activation.

## Properties

### anchorMinSimilarity?

> `optional` **anchorMinSimilarity**: `number`

Defined in: [src/lib/tools/serverTools.ts:828](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#828)

Minimum similarity an anchor must reach to activate the set.
Prevents false activation on prompts where the anchor barely passes
the global minSimilarity threshold. Default: 0.60

***

### anchors

> **anchors**: `string`\[]

Defined in: [src/lib/tools/serverTools.ts:822](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#822)

Tools that trigger the set when selected. If any anchor appears in the
semantic match results with a score at or above `anchorMinSimilarity`,
all members are pulled in.

***

### members

> **members**: `string`\[]

Defined in: [src/lib/tools/serverTools.ts:816](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#816)

All tool names in the set

***

### name

> **name**: `string`

Defined in: [src/lib/tools/serverTools.ts:814](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#814)

Human-readable name for logging/debugging

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:836](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#836)

System-prompt fragment to APPEND to the base prompt when this set is
active. Additive, never a replacement — it composes with the host's
persona / memory, so over-including it on a borderline match is harmless
(mirrors `expandToolSetsAdditive`). Collected for a selection by
toolSetSystemPrompts.
