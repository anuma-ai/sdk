# Subscription Analysis: Skill vs Tools Comparison

Prompt-only skill (LLM does all math in prose) vs structured tools (LLM extracts, code computes).

- Model: `openai/gpt-4.1`
- Runs per test: 10
- Date: 2026-04-09

## Methodology

Both approaches get the same statement and the same task. The skill uses the original
production prompt from ai-memoryless-client. The tools approach uses a shorter prompt
that delegates math to `analyze_subscriptions` and `flag_subscriptions`.

"Parse failed" means the regex couldn't extract a total from the skill's free-form output.
This is itself a data point — structured tool output never has this problem.

### Simple statement — 10 runs (9 items, all monthly)

Expected monthly total: **$180.18**

| Run | Skill (prompt) | Tools (structured) |
|---|---|---|
| 1 | $180.18 | $180.18 |
| 2 | $180.18 | $180.18 |
| 3 | $180.18 | $180.18 |
| 4 | $180.18 | $180.18 |
| 5 | $180.18 | $180.18 |
| 6 | $180.18 | $180.18 |
| 7 | $180.18 | $180.18 |
| 8 | $180.18 | $180.18 |
| 9 | $180.18 | $180.18 |
| 10 | $180.18 | $180.18 |

| Metric | Skill | Tools |
|---|---|---|
| Parseable | 10/10 | 10/10 |
| Exact (within $0.02) | 10/10 | 10/10 |
| Mean | $180.18 | $180.18 |
| Spread (max − min) | $0.00 | $0.00 |

---

### Mixed frequencies — 10 runs (13 items, weekly/monthly/annual)

Expected monthly total: **$453.94**

| Run | Skill (prompt) | Tools (structured) |
|---|---|---|
| 1 | $454.77 | $453.94 |
| 2 | $453.60 | $453.94 |
| 3 | $453.78 | $453.94 |
| 4 | $435.27 | $453.94 |
| 5 | $454.97 | $453.94 |
| 6 | $453.64 | $453.94 |
| 7 | $454.87 | $453.94 |
| 8 | $463.88 | $453.94 |
| 9 | $453.66 | $453.94 |
| 10 | $453.67 | $453.94 |

| Metric | Skill | Tools |
|---|---|---|
| Parseable | 10/10 | 10/10 |
| Exact (within $0.02) | 0/10 | 10/10 |
| Mean | $453.21 | $453.94 |
| Spread (max − min) | $28.61 | $0.00 |

---

### Extraction accuracy — mixed frequencies

The tools enforce schema but not extraction accuracy — the LLM could pass the wrong amount
and the tool would compute a consistent wrong answer. This checks what the LLM actually sent.

| Metric | Value |
|---|---|
| Fields checked | 130 |
| Correct | 130 (100%) |
| Errors | 0 |

All extractions matched the statement.
