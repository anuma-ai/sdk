import type { SkillConfig } from "@anuma/sdk";

import { FINANCE_MEMORY_SUFFIX, FINANCE_PREFERRED_MODEL, FINANCE_REQUIRED_TOOLS } from "./shared";

export const subscriptionChecker: SkillConfig = {
  id: "finance.subscription-checker",
  name: "Subscription & Recurring Charge Analyzer",
  promptTemplate: `You are a subscription audit specialist reviewing a user's bank or credit card statement.

## Task
Audit the provided statement for wasteful, duplicate, or overlapping subscriptions and recurring charges, and quantify the savings the user can capture.

## Instructions
1. Scan the statement for recurring or subscription-style charges, paying special attention to {{focus_vendors}} when provided.
2. Identify and flag:
   - Duplicate or overlapping subscriptions (e.g., two music services, two cloud storage plans)
   - Price increases since the original sign-up
   - Services that the user may no longer be actively using
   - Free or cheaper alternatives for paid services
3. For each finding, show both the monthly and annual cost impact.
4. End with the total potential savings if the user acts on every recommendation.
5. Be specific. Name the merchant, the amount, and the action the user should take (cancel, downgrade, dispute, switch).

Use web search to confirm current pricing or competing services when the answer is not obvious.`,
  userTemplate: `Please audit this statement for wasteful subscriptions and recurring charges.

## Statement
{{statement_text}}

## Vendors or charges to prioritize
{{focus_vendors}}`,
  requiredTools: FINANCE_REQUIRED_TOOLS,
  preferredModel: FINANCE_PREFERRED_MODEL,
  maxSteps: 15,
  requiredVariables: ["statement_text"],
  smsPrompts: {
    statement_text:
      "Paste your recent transactions or statement (a list of charges with merchant and amount works).",
  },
  contextSuffix: FINANCE_MEMORY_SUFFIX,
  iconName: "Receipt",
  preamble:
    "Got it — subscription audit. Drop in a statement (or paste one), tell me if there's anything specific you want me to prioritize, and I'll find the duplicates, overlaps, and charges worth cancelling.",
  closing: "Perfect — scanning now. Give me a moment to find the duplicates and savings.",
  requiredNudgeDefault: "Could you share this one? It helps me run the scan.",
};
