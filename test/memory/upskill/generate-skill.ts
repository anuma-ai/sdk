#!/usr/bin/env node
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { StructuredFact, TeacherTrace, TestCase } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TEACHER_MODEL = "claude-opus-4-6";

if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

async function callAnthropic(
  messages: { role: string; content: string }[],
  maxTokens = 4000,
  retries = 5
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: TEACHER_MODEL,
          messages,
          max_tokens: maxTokens,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        content: { type: string; text: string }[];
      };
      return data.content[0].text;
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = attempt * 5000;
      console.error(`  Attempt ${attempt}/${retries} failed, retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}

function parseJSON<T>(text: string): T {
  // Try to extract JSON from a response that may contain markdown fences
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim()) as T;
}

async function captureTeacherTrace(testCase: TestCase): Promise<TeacherTrace> {
  const conversationText = testCase.conversation.map((m) => `${m.role}: ${m.content}`).join("\n");

  const prompt = `You are an expert memory extraction system. Analyze this conversation and extract durable personal facts about the user.

Think step by step:
1. Read each message carefully
2. For each potential fact, reason about whether it's:
   - A durable personal fact (extract it)
   - A transient request (skip it)
   - A hypothetical/conditional (skip it)
   - Sarcasm or negation (handle carefully)
   - An update to a previous fact (extract the updated version)
3. Output your reasoning, then the extracted facts

<conversation>
${conversationText}
</conversation>

Respond in JSON (no markdown fences):
{
  "reasoning": "Your step-by-step thinking about what to extract and why...",
  "facts": ["The user...", ...],
  "structured": [{"type": "identity|preference|project|skill|constraint", "namespace": "...", "key": "...", "value": "..."}]
}`;

  const response = await callAnthropic([{ role: "user", content: prompt }], 4000);

  const parsed = parseJSON<{
    reasoning: string;
    facts: string[];
    structured: StructuredFact[];
  }>(response);

  return {
    testCaseId: testCase.id,
    reasoning: parsed.reasoning,
    extractedFacts: parsed.facts,
    extractedStructured: parsed.structured || [],
    correct: false, // evaluated later
  };
}

async function evaluateTrace(trace: TeacherTrace, testCase: TestCase): Promise<boolean> {
  const prompt = `You are a strict evaluation judge. Determine if the extracted facts semantically cover ALL ground truth facts.

Ground truth facts:
${testCase.groundTruthFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Extracted facts:
${trace.extractedFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

For each ground truth fact, determine if it is semantically covered by at least one extracted fact. A fact is "covered" if the extracted version captures the same core information, even if worded differently.

Respond in JSON (no markdown fences):
{
  "matches": [
    {"groundTruth": "...", "matchedBy": "..." or null, "covered": true/false}
  ],
  "allCovered": true/false
}`;

  const response = await callAnthropic([{ role: "user", content: prompt }], 2000);
  const parsed = parseJSON<{ allCovered: boolean }>(response);
  return parsed.allCovered;
}

async function distillSkill(traces: TeacherTrace[]): Promise<string> {
  const traceSummaries = traces
    .slice(0, 20)
    .map(
      (t, i) =>
        `### Trace ${i + 1}\nReasoning: ${t.reasoning}\nExtracted: ${t.extractedFacts.join("; ")}`
    )
    .join("\n\n");

  const prompt = `You are creating an extraction skill document for a smaller LLM to follow when extracting personal facts from conversations.

Below are ${traces.length} successful reasoning traces from an expert extractor. Each trace shows the step-by-step thinking that led to correct extractions.

${traceSummaries}

Synthesize these traces into a concise skill document (~500 tokens) that captures:

1. **Decision Framework**: When to extract vs skip a potential fact
2. **Extraction Rules**: How to phrase extracted facts (start with "The user...")
3. **Common Pitfalls**: Patterns that look like facts but aren't (transient requests, hypotheticals, sarcasm)
4. **Update Handling**: How to handle contradictions and updates to previous facts
5. **Structured Output**: How to assign type/namespace/key/value

The document should be actionable instructions, not abstract principles. Write it as a system prompt section that can be prepended to extraction prompts.

Output ONLY the skill document text, no JSON wrapper.`;

  return await callAnthropic([{ role: "user", content: prompt }], 2000);
}

async function main() {
  const casesPath = join(__dirname, "test-cases", "extraction-cases.json");
  const raw = await readFile(casesPath, "utf-8");
  const testCases: TestCase[] = JSON.parse(raw);

  process.stdout.write(`Loaded ${testCases.length} test cases. Capturing teacher traces...\n`);

  const traces: TeacherTrace[] = [];

  for (const testCase of testCases) {
    process.stdout.write(`  [${testCase.id}] (${testCase.difficulty}) ...`);
    try {
      const trace = await captureTeacherTrace(testCase);
      const correct = await evaluateTrace(trace, testCase);
      trace.correct = correct;
      traces.push(trace);
      process.stdout.write(
        ` ${correct ? "PASS" : "FAIL"} (${trace.extractedFacts.length} facts)\n`
      );
    } catch (error) {
      process.stdout.write(` ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  const correctTraces = traces.filter((t) => t.correct);
  process.stdout.write(`\n${correctTraces.length}/${traces.length} traces passed evaluation.\n`);

  if (correctTraces.length === 0) {
    throw new Error("No correct traces to distill from. Check test cases and teacher model.");
  }

  // Save raw traces for debugging
  const tracesDir = join(__dirname, "traces");
  await mkdir(tracesDir, { recursive: true });
  await writeFile(join(tracesDir, "teacher-traces.json"), JSON.stringify(traces, null, 2));

  process.stdout.write("Distilling skill from successful traces...\n");
  const skillDoc = await distillSkill(correctTraces);

  const skillsDir = join(__dirname, "skills");
  await mkdir(skillsDir, { recursive: true });
  const skillPath = join(skillsDir, "extraction-v1.md");
  await writeFile(skillPath, skillDoc);

  process.stdout.write(`Skill document written to ${skillPath}\n`);
  process.stdout.write(
    `  Length: ${skillDoc.split(/\s+/).length} words (~${Math.round(skillDoc.length / 4)} tokens)\n`
  );
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
