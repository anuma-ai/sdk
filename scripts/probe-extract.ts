/**
 * Smoke probe for extractFacts() against the live Anuma dev portal.
 * Run: PORTAL_API_KEY=... npx tsx scripts/probe-extract.ts
 */
import "dotenv/config";

import { extractFacts, type AutoExtractMessage } from "../src/lib/memory/autoExtract.js";

async function main() {
  const apiKey = process.env.PORTAL_API_KEY;
  if (!apiKey) throw new Error("PORTAL_API_KEY not set");

  const conversations: { name: string; messages: AutoExtractMessage[] }[] = [
    {
      name: "Mixed durable + transient",
      messages: [
        {
          id: "m1",
          role: "user",
          content:
            "I'm planning a trip to Tokyo in October. My partner Sara has never been. We want to do a cherry blossom thing but I know it's the wrong season.",
        },
        {
          id: "m2",
          role: "assistant",
          content:
            "Tokyo in October has its own beauty — autumn foliage at Rikugien Garden, Meiji Shrine, etc. Cherry blossoms are spring (March-April).",
        },
        { id: "m3", role: "user", content: "Got it. Also btw I'm running late for a meeting." },
      ],
    },
    {
      name: "Question, no durable facts",
      messages: [
        { id: "q1", role: "user", content: "What's a good restaurant in SF?" },
        { id: "q2", role: "assistant", content: "Depends on what you're craving!" },
      ],
    },
    {
      name: "State change",
      messages: [
        {
          id: "s1",
          role: "user",
          content:
            "I just moved from Portland to San Francisco last week. Big change but I'm settling in.",
        },
      ],
    },
  ];

  for (const { name, messages } of conversations) {
    console.log(`\n--- ${name} ---`);
    console.log(messages.map((m) => `  [${m.id}] ${m.role}: ${m.content}`).join("\n"));
    const t0 = Date.now();
    const candidates = await extractFacts(messages, { apiKey });
    console.log(`\n  → extracted ${candidates.length} candidate(s) in ${Date.now() - t0}ms:`);
    for (const c of candidates) {
      console.log(
        `    • [${c.type}, conf=${c.confidence.toFixed(2)}, src=${c.sourceMessageIds.join("+")}] ${c.content}` +
          (c.entities.length > 0 ? ` (entities: ${c.entities.join(", ")})` : "")
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
