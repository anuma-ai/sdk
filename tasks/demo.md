# Hackathon Demo — Memory Experience Overhaul

**When:** Fri May 8, 2026 · 9:00 AM PT
**Where:** Web build of `ai-memoryless-client` (`localhost:3000` for dry runs, prod URL for the actual demo)
**Length:** 5 minutes
**Track:** Anuma Chat

## Headline numbers (locked, c2599f6)

| | main HEAD (61edeb5) | our branch (c2599f6) | Δ |
|---|---:|---:|---:|
| **Claude Sonnet 4.6** | 73.0% | **87.2%** | **+14.2pp · +41 correct** |
| kimi-k2p5 | 70.9% (Mar 11 baseline) | 77.2% | +6.3pp |
| single-session-assistant (Claude) | 35.7% | **75.0%** | +39.3pp |
| multi-session (Claude) | 72.2% | 85.0% | +12.8pp |

LongMemEval public benchmark, 289 questions, oracle variant.

## 5-minute beat sheet

**0:00 – 0:30 — Hook**

> "How many of you have asked an AI assistant something it should remember — and it forgot?"

- Open chat. Use *current main* (or a screenshot of it).
- Ask: *"What time difference did you tell me earlier between Tokyo and SF?"* → main hallucinates or says "I don't have that context."
- Land: "We rebuilt Anuma's memory." Cut to demo build.

**0:30 – 1:30 — The graph reveal**

- Open `?page=memory-graph`.
- "This is what Anuma now knows. Entity hubs — people, places, things — surrounded by the memories that mention them. Every conversation builds this graph."
- Click a hub (e.g. **Sara**) → highlight neighbors.
- "It clusters automatically. No manual tagging."

**1:30 – 2:30 — Live extraction**

- Switch to chat. Send a fresh, factual message:

  > "I had dinner at Le Bernardin in midtown last Friday — Sara picked it for her birthday and the bill was $340."

- Assistant replies.
- Switch back to graph view. Three new amber-pulsing nodes appear: **Le Bernardin**, **Sara** (existing hub gains a new memory), and the dinner memory itself. Header pill shows `+3 just remembered`.
- "Three memories extracted from one message and connected to the right hubs in real time."

**2:30 – 3:30 — Recall demo (the payoff)**

- Stay in chat. Ask:

  > "What restaurant did you say I went to with Sara, and what did the bill come to?"

- Assistant answers correctly: "Le Bernardin in midtown Manhattan, last Friday — the bill was $340."
- Land: "That's the *single-session-assistant* category that current main scores 36% on. We're at 75%."

**3:30 – 4:30 — Numbers**

- Show the headline table (image or live page).
- Three takeaways, in order:
  1. "+14.2 percentage points on the public LongMemEval benchmark."
  2. "+41 more questions answered correctly out of 289."
  3. "+39 points on the hardest category — recall what the assistant told you earlier."
- "Apples-to-apples — same model (Claude Sonnet 4.6), same dataset, same 100-way concurrency."

**4:30 – 5:00 — Architecture & close**

- One sentence on the stack: *"Hindsight-style retrieval lanes — vault facts, raw conversation chunks, entity graph traversal — fused with a cross-encoder rerank. All on-device, encrypted, never leaves your wallet."*
- Close: *"From two memory systems to one. Anuma.ai."*

## Seed-data plan (Peter Lee persona)

Pre-load the demo wallet's vault with **~25 curated memories** that build a graph with visible hubs and a recall payoff. Persona: **Peter Lee**, SF-based product designer.

### Memories to seed (group → content)

**Identity & relationships (5)**
1. User's name is Peter Lee, a product designer based in San Francisco.
2. User's spouse is Sara Park, a software engineer at Stripe.
3. User has a corgi named Mochi who is 3 years old and weighs 22 pounds.
4. User is allergic to peanuts and shellfish — carries an EpiPen.
5. User's parents are Helen and David Lee, based in Vancouver, BC.

**Lifestyle & preferences (5)**
6. User climbs at Mission Cliffs in San Francisco twice a week, usually Tuesday and Thursday evenings.
7. User's favorite climbing partner is Jordan Park, Sara's younger brother.
8. User prefers IPAs over lagers and rates Pliny the Elder from Russian River as their favorite beer.
9. User runs 5 km on Sunday mornings along the Embarcadero, average pace 5:15/km.
10. User's apartment is in the Mission District near 19th and Valencia.

**Tech & purchases (4)**
11. User uses a 16-inch MacBook Pro M3 (2025) for design work.
12. User bought Apple AirPods Pro 2 in February 2026.
13. User's primary design tool is Figma; they joined the FigJam beta in March 2026.
14. User keeps a self-hosted Prometheus instance scraping their home network for personal monitoring.

**Travel & events (5)**
15. User went to dinner at Le Bernardin in midtown Manhattan on March 14, 2026 for Sara's 32nd birthday. The bill was $340; Sara had the seven-course tasting menu.
16. User is planning a 12-day trip to Japan with Sara from May 4 – 15, 2026 covering Tokyo, Kyoto, and Osaka.
17. User's parents visited San Francisco from April 12 – 15, 2026; they hiked Greenfield Park together.
18. User had a dentist appointment with Dr. Patel on April 28, 2026 at 9:30 AM.
19. User went to bed at 2:14 AM on the night of April 27, 2026 (the night before the dentist appointment).

**Assistant-subject memories (the differentiator) (4)**
20. Assistant told the user that Tokyo is 9 hours ahead of San Francisco.
21. Assistant recommended Le Bernardin in midtown for Sara's anniversary dinner.
22. Assistant recommended Greenfield Park hiking trails for the user's parents' visit in April.
23. Assistant computed that the user has 47 days between the start of their Japan trip (May 4) and Sara's brother Jordan's wedding (June 20).

**Plans & ongoing situations (2)**
24. User is interviewing for a Staff Designer role at Linear, with the next round on May 21, 2026.
25. User is reading "The Three-Body Problem" by Liu Cixin and is on chapter 14 as of May 4, 2026.

### Why this set

- **Graph clusters well**: Sara, Mochi, Le Bernardin, Greenfield Park, Jordan, Mission Cliffs all appear in 2+ memories → become hub entities.
- **Spans every LongMemEval category**: identity (1), preferences (8), events (15), multi-session (16+19+22), assistant-subject (20–23), single-session-user (10).
- **Sets up the live-extraction demo**: the "Le Bernardin dinner" message I send at 1:30 will *update* an existing entity, not create a new one — visually richer than a cold add.
- **Sets up the recall demo at 2:30**: the answer is grounded in a seeded memory + the live-added one, so the audience sees both.

## Seed loader

Add a dev-only button in MemoryVault page → "Load demo seed (Peter)". On click:
- Iterates the 25 memories above
- Calls `createMemoriesBatch` (already used by import flow) so they land in one transaction
- Skips silently if any memory's content already exists (idempotent re-runs)
- Toast confirms count after completion

Gate behind `useMemoryStudioEnabled` (same dev flag as the toast) so it doesn't ship to prod users.

## Pre-demo checklist (Fri morning)

- [ ] Fresh wallet, signed in
- [ ] Click "Load demo seed (Peter)" → confirm 25 memories show up in Memory Vault
- [ ] Open Memory Graph → confirm Sara / Le Bernardin / Mochi / Mission Cliffs / Jordan visible as hubs
- [ ] Send the dinner message in chat → confirm 3 amber pulses on graph and the live pill appears
- [ ] Ask the recall question → confirm correct answer with values
- [ ] Have the headline numbers slide ready (or open the README on benchmarks branch)
- [ ] Network on stable wifi (don't trust conference wifi — bring hotspot)
- [ ] Browser zoom set to 110% so back-row judges can read the graph
- [ ] Record 30-second fallback video of each beat in case wifi flakes

## Open questions

- Do we want citation hover-cards on the assistant answer at beat 2:30? Stronger payoff but ~4h plumbing change.
- A/B comparison panel (main vs ours, side-by-side answering the same question) — Thu PM stretch?
