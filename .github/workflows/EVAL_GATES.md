# Memory eval gates — shared notes

Five workflows (`extraction-eval`, `topic-eval`, `vault-search-eval`,
`consolidation-eval`, `recall-eval`) run live-LLM quality benchmarks against a
committed baseline. `memory-perf` measures work cost with deterministic
stand-ins. They share two non-obvious properties. This file is the one place
they are explained; each workflow points here rather than repeating them.

## 0. Which gates can block a merge

Read this from the repo, not from the ruleset UI. **A gate not listed as
required cannot fail your merge, whatever it reports.**

| Gate | Required context | Why |
| --- | --- | --- |
| `memory-perf` | `memory-perf-status` — **workflow converted, ruleset entry pending (#797)** | Deterministic, no secrets, ~32s. Blocking as soon as the context is added to main's ruleset; until then it reports but does not block. |
| `extraction-eval` | advisory | Live LLM, 2–4 min per queued merge |
| `topic-eval` | advisory | ” |
| `vault-search-eval` | advisory | ” |
| `consolidation-eval` | advisory | ” |
| `recall-eval` | advisory | ” |

The advisory gates report red/green and nothing else: a regression one of them
catches still needs a human to look at the check. That was the state of **all
six** until #797 — the point of listing it here is that "we have a gate for
that" and "that gate can stop a bad merge" were different claims, and only the
ruleset knew which was which.

Ordering, because it cannot be done in one step: the workflow conversion has to
merge **before** the context is added to the ruleset, or every PR blocks on a
context no workflow produces. So `memory-perf-status` is deliberately not
blocking for the window between those two changes. **When the ruleset entry
lands, update the row above** — a doc that claims a gate blocks when it does not
is the same failure this file exists to prevent, one level up.

Before adding one to the ruleset, do the conversion in §1 first. Requiring a
paths-scoped context is the specific mistake that bricked #784.

## 1. Live-LLM gates are ADVISORY, and must stay that way in their current shape

Each of the five is paths-scoped on `pull_request`, so on a PR that touches none
of its paths **no run is created at all** — the status context is *absent*, not
skipped. (`memory-perf` no longer is; see §0.)

That is fine while nothing requires it. It is fatal the moment one is marked
required: a required context that never reports blocks the PR forever. That
happened on #784, where `consolidation-eval-status` was required while
paths-scoped and no unrelated PR could enter the merge queue.

**To make one blocking**, all three are needed:

1. add a `merge_group:` trigger (the queue has no paths filter, so the status is
   always produced there),
2. drop `paths:` from `pull_request`,
3. add `if: github.event_name != 'pull_request'` to the eval job.

Then the `<gate>-status` context always reports and the eval runs in the queue.
After that conversion a **green status on a PR means the eval was skipped**, not
that it passed — the real run happens in the queue.

The cost is a full LLM eval on every queued merge (~2–4 min each), which is why
all five are advisory today.

`memory-perf` took a shorter route: it is deterministic and finishes in well
under a minute, so it simply dropped `paths:` and kept running on every PR. Step
3 is only needed when the run itself is too expensive to repeat.

## 1a. `vault-search-eval` runs TWO arms, and one of them is what we ship

A gate that measures a configuration nobody runs protects nothing. Until
2026-08-13 this suite had a single committed baseline at `ranker: cosine,
rerank: false`, while production web resolves `budget: 'mid'` — fused ranking
plus the cross-encoder — on **98.7%** of recall turns. A change that broke
fusion or the reranker scored green because neither was switched on.

Two baselines are committed and the gate runs both:

| File | Config | What it protects |
| --- | --- | --- |
| `baseline.json` | `ranker: cosine, rerank: false` | the cheap arm (`budget: 'low'`, mobile) |
| `baseline-production.json` | `ranker: fused, rerank: true` | `budget: 'mid'` — web's send path |

Regenerate them **as a pair** (`mode: save-baseline` does this). Capturing one
alone leaves the other pinned to an older corpus or embedding model, and the
recorded `config` block no longer explains the divergence.

`--save-baseline` writes to whatever `--baseline` names, defaulting to
`baseline.json`. It used to hardcode that path, so capturing the production arm
silently overwrote the control with fused+CE numbers.

### What the arms are worth (measured 2026-08-13, 108 memories / 100 queries)

| Arm | recall@k | nDCG |
| --- | --- | --- |
| cosine control | 0.825 | 0.786 |
| fused, no CE | 0.835 | 0.782 |
| fused + CE (head ≥ 4) | 0.845 | 0.792 |

Paired bootstrap over the same 100 queries: fused+CE vs control is
**+2.00pp recall, 95% CI [0.00, 5.00] — not significant**; CE vs fused-alone is
**+1.00pp, CI [0.00, 3.00] — not significant**. Every delta this corpus can
produce has a confidence interval containing zero, so **this suite cannot
resolve a 1-2pp change.** Treat it as a guard against breakage, not as evidence
that a ranking idea works. A claim of the form "X improves retrieval by 1pp" is
not supportable here and needs a bigger corpus or LongMemEval.

`--rerank-top-n` sweeps the cross-encoder head. Measured: **the CE's entire
benefit is delivered by a head of 4** — heads 5, 10, 20 and 30 are identical to
four decimals on all 100 queries (paired Δ = 0.00pp, CI [0.00, 0.00]), and a
head of 1 reproduces the no-rerank arm exactly, which is what proves the flag is
plumbed. The default is 30. In a browser that is ~26 pairs of pure cost — see
anuma-ai/sdk#845.

## 2. The status jobs use an allowlist, not a failure check

A job killed by `timeout-minutes` concludes **`cancelled`**, not `failure`. An
`if result == "failure"` test therefore posts green for a gate that never
finished. This was live: on run
[30302039028](https://github.com/anuma-ai/sdk/actions/runs/30302039028)
`e2e-tools` hit its 5-minute budget, concluded `cancelled`, and the **required**
`e2e-tools-status` went `success` three seconds later.

So every `<gate>-status` fails on anything that is not `success` or `skipped`.
These evals run on 20–45 minute budgets against a portal that can stall, so they
are far more exposed to this than the 5-minute job that exposed it.
