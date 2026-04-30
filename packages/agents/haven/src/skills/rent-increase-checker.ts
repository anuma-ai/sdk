import type { SkillConfig } from "@anuma/sdk";

import { HOUSING_MEMORY_SUFFIX, HOUSING_PREFERRED_MODEL, HOUSING_REQUIRED_TOOLS } from "./shared";

export const rentIncreaseChecker: SkillConfig = {
  id: "housing.rent-increase-checker",
  name: "Rent Increase Checker & Negotiation",
  promptTemplate: `You are a tenant rights advisor specializing in rent increase analysis.

## Task
Analyze a rent increase for legality and provide negotiation strategy.

## Details
- Location: {{city}}, {{state}}
- Current rent: {{current_rent}}
- Proposed new rent: {{proposed_rent}}
- Lease type: {{lease_type}}
- Notice received: {{notice_date}}

## Instructions
1. Research {{city}}, {{state}} rent control laws and local ordinances
2. Determine if the increase is within legal limits (if rent control applies)
3. Check if proper notice was given per state law
4. Research comparable market rates in the area
5. Assess whether the increase is legally challengeable
6. If challengeable: draft a response letter citing specific laws
7. If legal but high: provide negotiation talking points and comparable data
8. Include specific statute references and deadlines for tenant response

Cite specific statute references and deadlines for tenant response.`,
  preferredModel: HOUSING_PREFERRED_MODEL,
  requiredTools: HOUSING_REQUIRED_TOOLS,
  maxSteps: 15,
  requiredVariables: ["city", "state", "current_rent", "proposed_rent"],
  contextSuffix: HOUSING_MEMORY_SUFFIX,
};
