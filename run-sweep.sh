#!/bin/bash
# LongMemEval ranking-knob sweep — vault strategy, kimi answers, gpt-5-mini
# extraction (cached across runs). One knob per run vs baseline.
set -u
cd /tmp/sdk-sweep
mkdir -p results
KIMI="fireworks/accounts/fireworks/models/kimi-k2p6"
EXTRACT="openai/gpt-5-mini"

run() {
  local name=$1; shift
  if [ -f "results/$name.json" ]; then
    echo "=== RUN $name SKIPPED (results exist) ==="
    return
  fi
  echo "=== RUN $name START $(date +%H:%M:%S) ==="
  npx tsx test/memory/longmemeval.ts --strategy vault --variant s --max 150 --concurrency 2 \
    --llm "$KIMI" --extract-llm "$EXTRACT" --json -o "results/$name.json" "$@" \
    > "results/$name.log" 2>&1
  local acc
  acc=$(python3 -c "
import json,sys
try:
    d=json.load(open('results/$name.json'))
    s=d if 'accuracy' in d else next(iter(d.values()))
    print(f\"{s['accuracy']:.1%} ({s['correctAnswers']}/{s['totalQuestions']})\")
except Exception as e:
    print('PARSE-ERROR', e)
" 2>&1)
  echo "=== RUN $name DONE acc=$acc ==="
}

run baseline
run ce-weight-0     --ce-weight 0
run ce-weight-0.3   --ce-weight 0.3
run rrf-k-20        --rrf-k 20
run rrf-k-120       --rrf-k 120
run bm25-div-25     --bm25-divisor 25
run bm25-div-100    --bm25-divisor 100
run recency-alpha-0 --recency-alpha 0
run proof-alpha-0   --proof-count-alpha 0
run mmr-on          --mmr
echo "=== SWEEP COMPLETE ==="
