# Memory eval gates — shared notes

Five workflows (`extraction-eval`, `topic-eval`, `vault-search-eval`,
`consolidation-eval`, `recall-eval`) run live-LLM quality benchmarks against a
committed baseline. They share two non-obvious properties. This file is the one
place they are explained; each workflow points here rather than repeating them.

## 1. They are ADVISORY, and must stay that way in their current shape

Each gate is paths-scoped on `pull_request`, so on a PR that touches none of its
paths **no run is created at all** — the status context is *absent*, not skipped.

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
