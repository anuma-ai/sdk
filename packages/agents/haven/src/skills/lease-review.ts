import type { SkillConfig } from "@anuma/sdk";

import { HOUSING_MEMORY_SUFFIX, HOUSING_PREFERRED_MODEL, HOUSING_REQUIRED_TOOLS } from "./shared";

export const leaseReview: SkillConfig = {
  id: "housing.lease-review",
  name: "Lease Review & Red Flag Detection",
  promptTemplate: `You are a housing rights specialist reviewing a lease agreement.

## Task
Analyze a lease document and identify red flags, illegal clauses, and concerning provisions under {{state}} law.

## Instructions
1. Parse the lease clause by clause
2. Cross-reference each clause with {{state}} tenant protection laws
3. Flag any clauses that are:
   - Illegal or unenforceable under state law
   - Unusual or heavily favor the landlord
   - Missing standard protections required by law
4. For each red flag, cite the specific state statute or regulation
5. Provide a risk rating: HIGH / MEDIUM / LOW for each issue
6. Summarize with an overall assessment and recommended actions

Use web search to verify current {{state}} landlord-tenant law statutes. Be specific with legal citations.`,
  userTemplate: `Please review my lease under {{state}} law.

## Lease Text
{{lease_text}}`,
  requiredTools: HOUSING_REQUIRED_TOOLS,
  preferredModel: HOUSING_PREFERRED_MODEL,
  maxSteps: 15,
  requiredVariables: ["state", "lease_text"],
  smsPrompts: {
    state: "What state is your lease in?",
    lease_text:
      "Paste the lease text you want reviewed. If it's long, send the most important sections.",
  },
  contextSuffix: HOUSING_MEMORY_SUFFIX,
  iconName: "FileSearch",
  preamble:
    "Got it — lease review. Tell me a couple things about your housing and paste in (or upload) the lease, and I'll flag the red flags clause by clause.",
  closing:
    "Perfect — reviewing the lease now. Give me a moment and I'll surface the red flags.",
  requiredNudgeDefault: "I do need this one for the review — what would you like to put?",
};
