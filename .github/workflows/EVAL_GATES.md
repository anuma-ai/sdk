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
| `memory-perf` | **`memory-perf-status`** — required since 2026-07-31 | Deterministic, no secrets, ~32s. Converted in #797; a work-cost regression now blocks the merge. |
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

Ordering, for the next one: the workflow conversion has to merge **before** the
context is added to the ruleset, or every PR blocks on a context no workflow
produces. `memory-perf` went through that two-step on 2026-07-31 (#841 merged
16:17, ruleset updated straight after) — and **the row above must be updated in
the same sitting**, because a doc claiming a gate blocks when it does not is the
same failure this file exists to prevent, one level up.

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
