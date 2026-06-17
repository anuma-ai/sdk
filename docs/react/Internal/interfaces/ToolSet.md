# ToolSet

Defined in: [src/lib/tools/serverTools.ts:844](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#844)

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

Defined in: [src/lib/tools/serverTools.ts:860](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#860)

Minimum similarity an anchor must reach to activate the set.
Prevents false activation on prompts where the anchor barely passes
the global minSimilarity threshold. Default: 0.60

***

### anchors

> **anchors**: `string`\[]

Defined in: [src/lib/tools/serverTools.ts:854](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#854)

Tools that trigger the set when selected. If any anchor appears in the
semantic match results with a score at or above `anchorMinSimilarity`,
all members are pulled in.

***

### members

> **members**: `string`\[]

Defined in: [src/lib/tools/serverTools.ts:848](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#848)

All tool names in the set

***

### name

> **name**: `string`

Defined in: [src/lib/tools/serverTools.ts:846](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#846)

Human-readable name for logging/debugging

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/lib/tools/serverTools.ts:871](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#871)

System-prompt fragment to APPEND to the base prompt when this set
activates. Additive, never a replacement — it composes with the host's
persona / memory. Gated on genuine activation (anchor score ≥
`anchorMinSimilarity`, or a forced set) via activatedToolSetNames →
toolSetSystemPrompts, NOT on mere anchor presence — a borderline
anchor kept by recall-over-precision must not drag this persona in. Write
it to be self-limiting too (condition its behavior on the user actually
wanting what the set does), so a borderline activation doesn't bias the turn.
