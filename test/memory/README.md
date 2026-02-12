# Memory Evaluation Framework

Two evaluation tools for testing memory systems:

1. **SDK Tests** (`pnpm eval:memory`) - Fast unit tests for vector search
2. **LongMemEval** (`pnpm eval:longmemeval`) - End-to-end benchmark against
   academic dataset

## LongMemEval Benchmark

Full pipeline benchmark using the
[LongMemEval](https://github.com/xiaowu0162/LongMemEval) academic dataset (500
questions, ~50 sessions each).

```bash
pnpm eval:longmemeval --max 5                  # Test 5 questions
pnpm eval:longmemeval --max 2 --max-sessions 5 # Quick: 2 questions, 5 sessions each
pnpm eval:longmemeval --variant oracle --max 5 # Use oracle (answer-only) sessions
pnpm eval:longmemeval --strategy chunked --max 5 # Chunked tool search
pnpm eval:longmemeval --stats                  # Show dataset statistics
```

**What it tests**:
- Extraction strategy: Memory extraction → Embedding → Search → Answer generation → Evaluation
- Chunked tool strategy: Chunked conversation search → Tool-assisted answer generation → Evaluation

**Datasets** (cached in `~/.cache/longmemeval/`):

- `s` - Small (~50 sessions per question, 264MB)
- `m` - Medium (~500 sessions per question)
- `oracle` - Only answer sessions (fast, for dev)

**Chunked embeddings cache** (also in `~/.cache/longmemeval/`):

- `longmemeval_chunk_embeddings_<variant>_<model>.json`

**Requires**: `PORTAL_API_KEY` for LLM calls

## SDK Integration Tests

Fast unit tests for `searchSimilarMemoriesOp()` using custom fixtures, based on
[LongMemEval](https://github.com/xiaowu0162/LongMemEval) methodology.

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

### Test Modes

#### Quick Mode (default)

- Uses cached embeddings from `fixtures/embeddings.json`
- No API calls required
- Fast, suitable for CI and local development
- Run on every PR via GitHub Actions

#### Full Mode (`--full`)

- Generates fresh embeddings via Portal API
- Requires `PORTAL_API_KEY` in `.env`
- Updates cached embeddings for future quick runs
- Use when updating test fixtures or validating API changes

### Environment Variables

Create a `.env` file in the project root (required for `--full` mode):

```bash
# .env
PORTAL_API_KEY=your-api-key-here

# Optional: Override API URL (defaults to production)
# ANUMA_API_URL=https://portal.anuma-dev.ai
```

### Understanding Embeddings

The framework uses cached real embeddings to avoid API calls during testing:

- **Model**: `fireworks/accounts/fireworks/models/qwen3-embedding-8b`
- **Dimension**: 1536
- **Similarity range**: 0.02 - 0.58 (realistic)
- **Threshold**: 0.2 (optimized for real embeddings)
- **Cached in**: `fixtures/embeddings.json` (2.3MB, 40 embeddings)

Real embeddings typically have lower similarity scores (0.3-0.5 for relevant
items) compared to theoretical maximum of 1.0.

### Evaluation Metrics

The framework computes:

#### Retrieval Quality

- **Precision@K** (K=1,3,5,10): Fraction of retrieved items that are relevant
- **Recall@K**: Fraction of relevant items that are retrieved
- **MRR** (Mean Reciprocal Rank): Average 1/rank for first relevant item
- **NDCG@K**: Normalized Discounted Cumulative Gain (ranking quality)

#### Latency

- **Search Time**: p50, p95, p99 percentiles
- **Embedding Generation**: Time to generate embeddings via API

#### By Category

- Breakdown by difficulty (easy, medium, hard)
- Pass/fail rates per category

### Sample Output

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

### Adding New Test Cases

#### 1. Add Memories

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

#### 2. Add Test Queries

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

#### 3. Regenerate Embeddings

If you added new memories or queries, regenerate embeddings:

```bash
# Run full mode to generate fresh embeddings via API
pnpm eval:memory --full
```

This will:

- Call Portal API to generate embeddings for all memories and queries
- Save embeddings to `fixtures/embeddings.json`
- Run the SDK integration tests with fresh embeddings

#### 4. Run Tests

```bash
# Quick mode (uses cached embeddings)
pnpm eval:memory

# Full mode (regenerates embeddings)
pnpm eval:memory --full
```
