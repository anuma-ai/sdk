"""Generate cross-language fixtures for PromptSeal TS port.

Reads the canonical Python implementation from the promptseal repo and emits:
- canonical_corpus.json — 50 input objects + their canonical bytes (hex)
- receipt_corpus.json   — signed receipts the TS verifier must accept
- merkle_corpus.json    — leaf-set + root + per-index proofs

The TS test (cross_lang.test.ts) consumes the JSON files and asserts byte-equal
behaviour at every layer — canonical bytes, receipt verification, Merkle proofs.

Run from the anuma-sdk repo root:
  /Users/tanmay/IdeaProjects/kingpinXD/promptseal/.venv/bin/python3 \
    scripts/promptseal-generate-fixtures.py
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
from pathlib import Path

PROMPTSEAL_REPO = Path("/Users/tanmay/IdeaProjects/kingpinXD/promptseal")
sys.path.insert(0, str(PROMPTSEAL_REPO))

from promptseal.canonical import canonical_json
from promptseal.crypto import (
    generate_keypair,
    public_key_bytes,
    secret_key_bytes,
    sign,
)
from promptseal.merkle import build_merkle, inclusion_proof
from promptseal.receipt import build_signed_receipt

OUT_DIR = Path(__file__).parent.parent / "src" / "promptseal" / "__fixtures__"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii")


def gen_canonical_corpus() -> list[dict]:
    cases: list[dict] = []
    inputs = [
        # primitives
        None,
        True,
        False,
        0,
        1,
        -1,
        42,
        "hello",
        "",
        "unicode: αβγ ✓ 🎉",
        # nested structures
        [],
        {},
        [1, 2, 3],
        {"b": 1, "a": 2},
        {"z": [3, 2, 1], "a": {"y": True, "x": None}},
        # numeric edge cases (Python preserves source representation in canonical_json)
        # but JS round-trips collapse 0.0 → 0; ensure_ascii=False handled through canonicalization
        # Using floats explicitly (these go through float in Python json.dumps)
        0.0,
        1.5,
        -2.25,
        # sorted keys + nested
        {"key1": "val1", "key0": ["c", "b", "a"]},
        # large nesting
        {"outer": {"inner": {"deep": [1, "two", None, {"e": True}]}}},
        # strings with control chars
        "line1\nline2",
        "quote\"inside",
        "tab\there",
        # mixed
        {"timestamp": "2026-04-30T18:22:01.123Z", "events": [{"type": "x"}]},
    ]
    while len(inputs) < 30:
        # Pad with deterministic synthetic objects so we hit 30+.
        i = len(inputs)
        inputs.append({"i": i, "label": f"obj-{i}", "flags": [i % 2 == 0, i % 3 == 0]})
    for i, obj in enumerate(inputs):
        try:
            bytes_out = canonical_json(obj)
            cases.append({
                "name": f"case_{i:02d}",
                "input": obj,
                "canonical_hex": bytes_out.hex(),
                "canonical_text": bytes_out.decode("utf-8"),
                "sha256_hex": hashlib.sha256(bytes_out).hexdigest(),
            })
        except Exception as exc:
            cases.append({
                "name": f"case_{i:02d}",
                "input": obj,
                "error": str(exc),
            })
    return cases


def gen_receipt_corpus() -> dict:
    sk_obj = generate_keypair()
    pk_b = public_key_bytes(sk_obj)
    sk_seed = secret_key_bytes(sk_obj)

    receipts: list[dict] = []
    parent: str | None = None
    timestamps = [
        "2026-04-30T18:22:01.000Z",
        "2026-04-30T18:22:01.100Z",
        "2026-04-30T18:22:01.200Z",
        "2026-04-30T18:22:01.300Z",
        "2026-04-30T18:22:01.400Z",
        "2026-04-30T18:22:01.500Z",
        "2026-04-30T18:22:01.600Z",
        "2026-04-30T18:22:01.700Z",
        "2026-04-30T18:22:01.800Z",
        "2026-04-30T18:22:01.900Z",
    ]
    events = [
        ("llm_start", {"model": "claude", "messages_hash": "sha256:aa"}),
        ("llm_end", {"output_hash": "sha256:bb"}),
        ("tool_start", {"tool_name": "resume_parse", "args_hash": "sha256:cc"}),
        ("tool_end", {"tool_name": "resume_parse", "output_hash": "sha256:dd"}),
        ("tool_start", {"tool_name": "score_candidate", "args_hash": "sha256:ee"}),
        ("tool_end", {"tool_name": "score_candidate", "output_hash": "sha256:ff"}),
        ("tool_start", {"tool_name": "decide", "args_hash": "sha256:gg"}),
        ("tool_end", {"tool_name": "decide", "output_hash": "sha256:hh"}),
        ("final_decision", {"candidate_id": "res_001", "decision": "hire", "reasoning_hash": "sha256:ii"}),
        ("error", {"stage": "tool", "error_type": "timeout", "message_hash": "sha256:jj"}),
    ]
    for i, (ev_type, payload) in enumerate(events):
        r = build_signed_receipt(
            sk=sk_obj,
            agent_id="ts-port-agent",
            agent_erc8004_token_id=633,
            event_type=ev_type,
            payload_excerpt=payload,
            parent_hash=parent,
            paired_event_hash=None,
            timestamp=timestamps[i],
        )
        receipts.append(r)
        parent = r["event_hash"]
    return {
        "secret_key_b64": _b64(sk_seed),
        "public_key_b64": _b64(pk_b),
        "agent_id": "ts-port-agent",
        "agent_erc8004_token_id": 633,
        "receipts": receipts,
    }


def gen_merkle_corpus() -> list[dict]:
    cases: list[dict] = []
    leaf_sets = [
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(1)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(2)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(3)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(4)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(5)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(7)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(8)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(11)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(14)],
        [hashlib.sha256(f"x{i}".encode()).hexdigest() for i in range(17)],
    ]
    for leaves_raw in leaf_sets:
        leaves = [f"sha256:{h}" for h in leaves_raw]
        tree = build_merkle(leaves)
        proofs = [inclusion_proof(leaves, idx) for idx in range(len(leaves))]
        cases.append({
            "leaf_count": len(leaves),
            "leaves": leaves,
            "root": tree["root"],
            "proofs": proofs,
        })
    return cases


def main() -> None:
    canonical = gen_canonical_corpus()
    (OUT_DIR / "canonical_corpus.json").write_text(json.dumps(canonical, indent=2))
    receipt = gen_receipt_corpus()
    (OUT_DIR / "receipt_corpus.json").write_text(json.dumps(receipt, indent=2))
    merkle = gen_merkle_corpus()
    (OUT_DIR / "merkle_corpus.json").write_text(json.dumps(merkle, indent=2))
    print(f"wrote canonical_corpus ({len(canonical)} cases) → {OUT_DIR / 'canonical_corpus.json'}")
    print(f"wrote receipt_corpus  ({len(receipt['receipts'])} receipts) → {OUT_DIR / 'receipt_corpus.json'}")
    print(f"wrote merkle_corpus   ({len(merkle)} cases) → {OUT_DIR / 'merkle_corpus.json'}")


if __name__ == "__main__":
    main()
