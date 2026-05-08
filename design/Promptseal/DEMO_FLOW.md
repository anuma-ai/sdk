# PromptSeal — demo flow

Cheat-sheet for live demos. Two halves: **how a proof is created** while the
agent runs, and **how anyone can verify it later** with nothing but a public
RPC.

---

## 1. Proof creation

What happens between clicking *Run agent* and clicking *Anchor*.

- Every LLM and tool boundary fires a lifecycle hook from `runToolLoop`
  (`onLlmStart`, `onLlmEnd`, `onToolStart`, `onToolEnd`).
- Each hook builds a **receipt**: agent id, event type, timestamp, a small
  payload excerpt (e.g. `tool_name: resume_parse`, `model: openai/gpt-5.4`),
  plus `parent_hash` linking to the previous receipt.
- The receipt body is canonicalised (sorted JSON, byte-stable), SHA-256'd
  into `event_hash`, then Ed25519-signed with the agent's secret key.
- Signed receipts are appended to IndexedDB. The chain refuses any insert
  whose `parent_hash` doesn't match the current tip — tampering breaks it
  immediately.
- When the run ends, a **Merkle tree** is built over every `event_hash`. Its
  root is sent on-chain as a self-send tx on Base Sepolia, with the 32-byte
  root as `tx.input`. That tx hash is the public anchor.

```
 ┌─────────────────┐
 │  Agent run      │   runToolLoop fires hooks for each
 │  (in browser)   │   LLM and tool boundary
 └────────┬────────┘
          │  hook event
          ▼
 ┌──────────────────────────────────────┐
 │  Build receipt                       │
 │  • canonical JSON                    │
 │  • parent_hash → previous event      │
 │  • SHA-256 → event_hash              │
 │  • Ed25519 sign (agent SK)           │
 └────────┬─────────────────────────────┘
          │ append (chain check)
          ▼
 ┌─────────────────┐
 │  IndexedDB      │   hash-chained log,
 │  (Dexie)        │   one row per receipt
 └────────┬────────┘
          │ run finishes
          ▼
 ┌──────────────────────────┐      ┌──────────────────────┐
 │  Merkle tree over        │      │  Base Sepolia        │
 │  [event_hash, ...]       │ ───▶ │  tx.input = root     │
 │  root = sha256-tree      │      │  (self-send, 0 ETH)  │
 └──────────────────────────┘      └──────────────────────┘
                                              │
                                              ▼
                                       anchor tx hash
                                       (the public proof handle)
```

---

## 2. Proof verification

What the static verifier (`/promptseal-verifier`) does with a pasted
`{receipt, proof, tx_hash}`. Five short-circuiting steps — first failing
step turns the badge red.

- **Step 1 — recompute event_hash.** Canonicalise the receipt body, SHA-256
  it, and compare to `event_hash`. Catches any post-signing edit to
  `payload_excerpt`, `timestamp`, `parent_hash`, etc.
- **Step 2 — verify signature.** Ed25519-verify `signature` against
  `public_key` over the same canonical bytes. Catches forged receipts that
  weren't signed by the agent.
- **Step 3 — walk the Merkle proof.** Hash leaf with each sibling per the
  `L`/`R` side flags to reconstruct a root.
- **Step 4 — fetch on-chain anchor.** `eth_getTransactionByHash` against a
  public Base Sepolia RPC; `tx.input` must be exactly 32 bytes (a SHA-256
  root).
- **Step 5 — compare roots.** Reconstructed root from step 3 must equal the
  on-chain root from step 4. Match ⇒ this exact receipt was committed in
  that tx.

```
 paste { receipt, proof, tx_hash }
          │
          ▼
 ┌─────────────────────────────┐
 │ 1. canonicalise + SHA-256   │  receipt body unchanged?
 │    == receipt.event_hash ?  │  fail → "tampered body"
 └────────┬────────────────────┘
          ▼
 ┌─────────────────────────────┐
 │ 2. Ed25519 verify           │  signed by claimed agent?
 │    (sig, pubkey, body)      │  fail → "bad signature"
 └────────┬────────────────────┘
          ▼
 ┌─────────────────────────────┐
 │ 3. walk Merkle proof        │  leaf belongs in some tree?
 │    leaf + siblings → root   │  produces "proof root"
 └────────┬────────────────────┘
          ▼
 ┌─────────────────────────────┐    ┌──────────────────────┐
 │ 4. eth_getTransactionByHash │ ──▶│ Base Sepolia RPC     │
 │    tx.input (32 bytes)      │    │ (any public node)    │
 └────────┬────────────────────┘    └──────────────────────┘
          │ "chain root"
          ▼
 ┌─────────────────────────────┐
 │ 5. proof root == chain root │  same tree? ⇒ ✓ VERIFIED
 │                             │  mismatch  ⇒ ✗ TAMPERED
 └─────────────────────────────┘
```

---

## Notes

- *Creation* gives you a tamper-evident log of an agent run: every step is
  signed, chained, and committed to a public ledger in one tx.
- *Verification* needs nothing from us — just the receipt JSON, the proof
  array, the tx hash, and any Base Sepolia RPC. No SDK, no portal, no
  Privy.
- The verifier is one HTML file plus two JS files. View source on stage if
  someone asks.
