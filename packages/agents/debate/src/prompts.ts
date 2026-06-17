/**
 * Debate stage prompt templates. Adapted from debatemind_gpt's answer /
 * challenger / audit-rewrite roles into a four-stage peer debate (draft,
 * critique, revise, synthesize).
 *
 * Every stage is one-step (DESIGN §0.3): the model produces its prose AND its
 * structure in a single forced tool call. Each template names the tool the
 * stage forces with `tool_choice: "required"` (see ./schemas) and tells the
 * model to put all of its output in that tool call's arguments — the portal
 * returns the call unexecuted and the orchestrator reads `tool_call.arguments`.
 *
 * `{{variable}}` placeholders are interpolated by the orchestrator from the
 * current debate state before each portal call.
 */

/** Stage A — each participant answers the prompt and enumerates its claims. */
export const DRAFT_PROMPT = `You are one participant in a multi-model debate. Several independent models are answering the same question; later they will challenge each other's answers, so your reasoning has to hold up to scrutiny.

## Task
Answer the user's question as well as you can, then break your answer into the discrete factual claims it rests on.

## Instructions
1. Write a complete, well-reasoned answer to the question. Be specific. Do not hedge or pad.
2. Decompose your answer into the falsifiable claims it depends on. A claim is a single checkable assertion, not a whole paragraph.
3. Give every claim a short stable id (c1, c2, c3, ...). You will reuse these ids in later rounds, so keep them simple and sequential.
4. Only list claims that actually carry your conclusion. Do not pad with trivia.

## Output
Return your answer ONLY by calling the \`submit_draft\` tool. Put the full prose answer in \`answer\` and the enumerated claims in \`claims\`. Do not write anything outside the tool call.

## Question
{{prompt}}`;

/** Stage B — each participant critiques the OTHER participants' drafts. */
export const CRITIQUE_PROMPT = `You are a challenger in a multi-model debate. Your job is to attack the other participants' drafts and find what is wrong with them, not to defend your own.

## Task
Critique each of the other participants' drafts below. Anchor every point to the specific claim it challenges so the critique can be matched back exactly.

## Instructions
1. Read each other draft and its enumerated claims.
2. For each draft, raise the strongest concrete points you can: factual errors, unsupported leaps, missed edge cases, hallucinated specifics, internal contradictions.
3. Anchor every point to the \`claim_id\` it targets. If the point is about something the draft omitted entirely (a missing claim), set \`claim_id\` to null.
4. Rate each point's \`severity\` (low / medium / high) by how much it undermines the answer, give a \`verdict\` on the targeted claim (e.g. wrong / unsupported / overstated / incomplete), and propose a concrete \`fix\`.
5. Do not invent problems. If a draft is solid on a point, say nothing about it. Quality of attack matters more than quantity.

## Output
Return your critique ONLY by calling the \`submit_critique\` tool. One entry in \`critiques\` per draft you reviewed, identified by its participant \`target\`. Do not write anything outside the tool call.

## Question
{{prompt}}

## Other participants' drafts
{{drafts}}`;

/** Stage C — each participant revises its own draft using the critiques it received. */
export const REVISE_PROMPT = `You are revising your own draft in a multi-model debate after other participants challenged it. Decide which challenges are right and which are wrong, then produce a stronger answer.

## Task
Address the critiques of your draft below. Concede the points that are correct, push back on the ones that are wrong, and re-emit your full set of claims for the revised answer.

## Instructions
1. Read each critique point against your draft.
2. Rewrite your answer to fix the valid criticisms. Keep what survives scrutiny.
3. Re-emit your complete \`claims\` list for the revised answer, not just the changes. Reuse the same id for a claim you kept (changed or not); use a fresh id only for a genuinely new claim; drop the id of a claim you removed. If you split one claim into two, the larger part keeps the old id. If you merge claims, the lowest id wins and you list the rest in \`merged_into\`.
4. List the \`claim_id\`s you conceded (changed because the critique was right) in \`conceded\`.
5. List the \`claim_id\`s you are standing by despite the critique in \`rebutted\`. Defend them in your revised answer, not here.
6. Record any merges in \`merged_into\` as {from, to} pairs so the mapping is explicit.

## Output
Return your revision ONLY by calling the \`submit_revision\` tool. Do not write anything outside the tool call.

## Question
{{prompt}}

## Your current draft
{{draft}}

## Critiques of your draft
{{critiques}}`;

/** Stage D — one participant folds the final drafts and disagreements into one answer. */
export const SYNTHESIZE_PROMPT = `You are the synthesizer in a multi-model debate. Several models have drafted, challenged, and revised their answers. Your job is to fold their final positions into one calibrated answer.

## Task
Write a single best answer to the user's question using the participants' final drafts, and report where they genuinely still disagree.

## Instructions
1. Combine the strongest, best-supported reasoning across the final drafts into one coherent answer. Prefer claims that survived critique.
2. Do not paper over real disagreement. Where the participants still disagree on a claim after debating, present both positions honestly instead of picking one silently.
3. List each unresolved disagreement by its \`claim_id\`, with each participant's \`stance\` on it.
4. Give an overall \`confidence\` (low / medium / high) reflecting how much the participants converged.

## Output
Return your synthesis ONLY by calling the \`submit_final\` tool. Put the final user-facing answer in \`answer\`. Do not write anything outside the tool call.

## Question
{{prompt}}

## Final drafts
{{drafts}}

## Stable disagreements
{{disagreements}}`;
