# Memory Evaluation Framework

SDK integration testing framework for memory retrieval functionality, based on LongMemEval methodology.

## Quick Start

```bash
# Quick mode: Run with cached embeddings (no API required)
pnpm eval:memory

# Full mode: Generate fresh embeddings via API (requires PORTAL_API_KEY)
pnpm eval:memory --full

# Output as JSON
pnpm eval:memory --json

# Show detailed results
pnpm eval:memory --verbose

# Write results to file
pnpm eval:memory --output results.json
```

This tests the complete SDK stack including:
- `searchSimilarMemoriesOp()` function
- WatermelonDB memory operations (save, search, retrieve)
- SDK's `cosineSimilarity` calculation
- Full integration (database + search + retrieval)

## Test Modes

### Quick Mode (default)
- Uses cached embeddings from `fixtures/embeddings.json`
- No API calls required
- Fast, suitable for CI and local development
- Run on every PR via GitHub Actions

### Full Mode (`--full`)
- Generates fresh embeddings via Portal API
- Requires `PORTAL_API_KEY` in `.env`
- Updates cached embeddings for future quick runs
- Use when updating test fixtures or validating API changes

## Environment Variables

Create a `.env` file in the project root (required for `--full` mode):

```bash
# .env
PORTAL_API_KEY=your-api-key-here

# Optional: Override API URL (defaults to production)
# REVERBIA_API_URL=https://ai-portal-dev.zetachain.com
```

## Understanding Embeddings

The framework uses cached real embeddings to avoid API calls during testing:

- **Model**: `openai/text-embedding-3-small`
- **Dimension**: 1536
- **Similarity range**: 0.02 - 0.58 (realistic)
- **Threshold**: 0.2 (optimized for real embeddings)
- **Cached in**: `fixtures/embeddings.json` (2.3MB, 40 embeddings)

Real embeddings typically have lower similarity scores (0.3-0.5 for relevant items) compared to theoretical maximum of 1.0.

## Architecture

```
test/memory/
├── eval-memory.ts              # Main CLI entry point
├── eval/
│   ├── types.ts               # TypeScript type definitions
│   ├── metrics.ts             # Precision@K, Recall@K, MRR, NDCG
│   ├── runner.ts              # Test orchestration
│   ├── suites/
│   │   └── sdk-retrieval.ts   # SDK integration tests
│   └── reporters/
│       └── console.ts         # Terminal output formatting
└── fixtures/
    ├── memories.json          # 20 sample memories
    ├── queries.json           # 20 test queries
    └── embeddings.json        # Cached embeddings (1536-dim real, 2.3MB)
```

## Evaluation Metrics

The framework computes:

### Retrieval Quality

- **Precision@K** (K=1,3,5,10): Fraction of retrieved items that are relevant
- **Recall@K**: Fraction of relevant items that are retrieved
- **MRR** (Mean Reciprocal Rank): Average 1/rank for first relevant item
- **NDCG@K**: Normalized Discounted Cumulative Gain (ranking quality)

### Latency

- **Search Time**: p50, p95, p99 percentiles
- **Embedding Generation**: Time to generate embeddings via API

### By Category

- Breakdown by difficulty (easy, medium, hard)
- Pass/fail rates per category

## Sample Output

```
Memory Evaluation Results
═════════════════════════════════════════════════════════════════

SDK Integration Tests
─────────────────────────────────────────────────────────────────
  Tests Passed:   20/20  (100.00%)

Retrieval Accuracy
─────────────────────────────────────────────────────────────────
  Precision@1:    1.0000  ████████████████████
  Precision@5:    1.0000  ████████████████████
  Recall@5:       1.0000  ████████████████████
  MRR:            1.0000
  NDCG@5:         1.0000

Latency (p50 / p95 / p99)
─────────────────────────────────────────────────────────────────
  Search:       2.1ms / 5.4ms / 8.9ms

By Difficulty
─────────────────────────────────────────────────────────────────
  easy:            10/10  (100.00%)
  medium:            8/8  (100.00%)
  hard:              2/2  (100.00%)

✓ All tests passed
```

## Adding New Test Cases

### 1. Add Memories

Edit [fixtures/memories.json](fixtures/memories.json):

```json
{
  "memories": [
    {
      "id": "mem-021",
      "type": "preference",
      "namespace": "food",
      "key": "favorite_snack",
      "value": "dark chocolate",
      "rawEvidence": "I love dark chocolate, especially 85% cacao",
      "confidence": 0.9
    }
  ]
}
```

### 2. Add Test Queries

Edit [fixtures/queries.json](fixtures/queries.json):

```json
{
  "queries": [
    {
      "id": "query-021",
      "query": "What snacks does the user enjoy?",
      "relevantMemoryIds": ["mem-021"],
      "difficulty": "easy"
    }
  ]
}
```

### 3. Regenerate Embeddings

If you added new memories or queries, regenerate embeddings:

```bash
# Run full mode to generate fresh embeddings via API
pnpm eval:memory --full
```

This will:
- Call Portal API to generate embeddings for all memories and queries
- Save embeddings to `fixtures/embeddings.json`
- Run the SDK integration tests with fresh embeddings

### 4. Run Tests

```bash
# Quick mode (uses cached embeddings)
pnpm eval:memory

# Full mode (regenerates embeddings)
pnpm eval:memory --full
```

## CI Integration

The framework runs automatically on every pull request via GitHub Actions:

- Workflow: [.github/workflows/memory-eval.yml](../../.github/workflows/memory-eval.yml)
- Uses cached embeddings (no API key required)

## References

- [LongMemEval Paper (ICLR 2025)](https://github.com/xiaowu0162/LongMemEval)
