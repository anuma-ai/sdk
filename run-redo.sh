#!/bin/bash
# Redo runs invalidated by infra failures, after the repeats finish.
set -u
cd /tmp/sdk-sweep
until grep -q "REPEATS COMPLETE" results/sweep-master.log 2>/dev/null; do sleep 120; done
KIMI="fireworks/accounts/fireworks/models/kimi-k2p6"
EXTRACT="openai/gpt-5-mini"
name=rrf-k-20
echo "=== RUN $name (redo) START $(date +%H:%M:%S) ==="
npx tsx test/memory/longmemeval.ts --strategy vault --variant s --max 150 --concurrency 2 \
  --llm "$KIMI" --extract-llm "$EXTRACT" --rrf-k 20 --json -o "results/$name.json" > "results/$name.log" 2>&1
acc=$(python3 -c "
import json
d=json.load(open('results/$name.json'))
s=d if 'accuracy' in d else next(iter(d.values()))
print(f\"{s['accuracy']:.1%} ({s['correctAnswers']}/{s['totalQuestions']})\")" 2>&1)
fails=$(grep -cE 'API embedding failed|✗' "results/$name.log" || true)
echo "=== RUN $name (redo) DONE acc=$acc hardfails=$fails ==="
echo "=== REDO COMPLETE ==="
