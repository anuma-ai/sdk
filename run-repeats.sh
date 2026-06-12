#!/bin/bash
# Variance estimation: wait for the main sweep, then run baseline repeats.
set -u
cd /tmp/sdk-sweep
until grep -q "SWEEP COMPLETE" results/sweep-master.log 2>/dev/null; do sleep 120; done
KIMI="fireworks/accounts/fireworks/models/kimi-k2p6"
EXTRACT="openai/gpt-5-mini"
for name in baseline-repeat-a baseline-repeat-b; do
  [ -f "results/$name.json" ] && continue
  echo "=== RUN $name START $(date +%H:%M:%S) ==="
  npx tsx test/memory/longmemeval.ts --strategy vault --variant s --max 150 --concurrency 2 \
    --llm "$KIMI" --extract-llm "$EXTRACT" --json -o "results/$name.json" > "results/$name.log" 2>&1
  acc=$(python3 -c "
import json
d=json.load(open('results/$name.json'))
s=d if 'accuracy' in d else next(iter(d.values()))
print(f\"{s['accuracy']:.1%} ({s['correctAnswers']}/{s['totalQuestions']})\")" 2>&1)
  echo "=== RUN $name DONE acc=$acc ==="
done
echo "=== REPEATS COMPLETE ==="
