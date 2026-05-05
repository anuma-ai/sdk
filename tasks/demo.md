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

### Memories to seed — v2 (18 memories, 6 hubs)

Tighter than v1: dropped the tech-stack rows (MacBook / AirPods / Figma / Prometheus) because they generated capitalized-token noise crowding out the human story. Each memory is anchored to one of six recognizable hubs.

**Identity (3)**
1. User's name is Peter Lee, a product designer based in San Francisco.
2. User's parents are Helen and David Lee, based in Vancouver, BC.
3. User is allergic to peanuts and shellfish — carries an EpiPen.

**Sara hub (4)**
4. User's spouse is Sara Park, a software engineer.
5. User went to dinner at Le Bernardin in midtown Manhattan on March 14, 2026 for Sara's 32nd birthday. The bill was $340; Sara had the seven-course tasting menu.
6. User is planning a 12-day trip to Japan with Sara from May 4 – 15, 2026 covering Tokyo, Kyoto, and Osaka.
7. Sara's brother Jordan Park is getting married on June 20, 2026; the wedding is in Vancouver.

**Mochi hub (3)**
8. User has a corgi named Mochi who is 3 years old and weighs 22 pounds.
9. User takes Mochi for morning walks in Dolores Park before work.
10. User's vet for Mochi is Dr. Fujita at Mission Pet Hospital.

**Mission Cliffs hub (3)**
11. User climbs at Mission Cliffs in San Francisco twice a week, usually Tuesday and Thursday evenings.
12. User's favorite climbing partner at Mission Cliffs is Jordan Park, Sara's younger brother.
13. User is projecting a V5 boulder problem at Mission Cliffs called "Tidal Wave."

**Greenfield Park hub (2)**
14. User's parents visited San Francisco from April 12 – 15, 2026; they hiked Greenfield Park together.
15. Assistant recommended Greenfield Park hiking trails for the user's parents' visit in April.

**Le Bernardin hub (2 — #5 + #16)**
16. Assistant recommended Le Bernardin in midtown for Sara's anniversary dinner.

**Japan / Tokyo hub (3 — #6 + #17 + #18)**
17. Assistant told the user that Tokyo is 9 hours ahead of San Francisco.
18. Assistant computed that the user has 47 days between the start of their Japan trip on May 4 and Sara's brother Jordan Park's wedding on June 20.

### Recall questions that reliably trigger `memory_vault_search`

The auto-highlight only fires when the assistant calls the search tool, which happens for memory-only questions. Use these — generic-knowledge questions ("system design resources") will skip the tool and the graph won't pulse.

- *"What's my dog's name?"* → #8 (Mochi hub)
- *"What restaurant did Sara and I go to for her birthday?"* → #5, #16 (Sara + Le Bernardin)
- *"Where am I traveling in May?"* → #6, #17, #18 (Japan/Tokyo hub)
- *"Who is Jordan Park?"* → #7, #12 (Sara + Mission Cliffs)
- *"What time difference did you tell me earlier between Tokyo and SF?"* → #17
- *"What am I projecting at Mission Cliffs?"* → #13
- *"What am I allergic to?"* → #3
- *"How many days between my Japan trip and Jordan's wedding?"* → #18

### Why this set

- **6 prominent hubs**: Sara, Mochi, Le Bernardin, Mission Cliffs, Greenfield Park, Japan — all appear in 2+ memories → become legible graph hubs.
- **No tech-stack noise**: dropped MacBook / AirPods / Figma / Prometheus; the noise entities they produced are gone.
- **Demo questions land on hubs the audience already saw**: each recall triggers green pulses on memory + entity nodes that are visible in the canvas.
- **Sets up the live-extraction beat**: "I had dinner at Le Bernardin with Sara last Friday — the bill was $340" *updates* an existing hub instead of cold-adding.

## Seed controls (shipped — `apps/web/components/Home/components/MemoryVault/DemoSeedButton.tsx`)

Three dev-only buttons in the bottom-left of the Memory Vault page, gated behind `useMemoryStudioEnabled` (`localStorage.setItem('__ENABLE_MEMORY_STUDIO__', 'true'); location.reload()`):

1. **Load demo seed (Peter)** — inserts the 18 v2 seed memories whose exact content isn't already in the vault. Idempotent.
2. **Clear seed** — deletes only memories whose content matches the current seed list. Real-vault content from other conversations is untouched.
3. **Clear ALL** — deletes every memory in the vault, with a confirm prompt. Use to start a totally clean dry run.

## Pre-demo checklist (Fri morning)

- [ ] Fresh wallet, signed in
- [ ] Click "Clear ALL" if vault has unrelated content → confirm vault empty
- [ ] Click "Load demo seed (Peter)" → confirm 18 memories show up in Memory Vault
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
