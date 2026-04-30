import type { SkillConfig } from "@anuma/sdk";

import { HOUSING_MEMORY_SUFFIX, HOUSING_PREFERRED_MODEL, HOUSING_REQUIRED_TOOLS } from "./shared";

export const hoaDispute: SkillConfig = {
  id: "housing.hoa-dispute",
  name: "HOA Dispute Response",
  promptTemplate: `You are an HOA dispute specialist helping a homeowner respond to an HOA action.

## Task
Analyze an HOA dispute and draft a formal response.

## Details
- State: {{state}}
- HOA name: {{hoa_name}}
- Issue type: {{issue_type}}
- HOA notice/violation: {{hoa_notice}}
- Homeowner's position: {{homeowner_position}}
- CC&Rs relevant sections: {{ccr_text}}

## Instructions
1. Analyze the HOA's notice/violation for procedural correctness
2. Research {{state}} HOA law (e.g., Common Interest Development Act, HOA Bill of Rights)
3. Cross-reference the HOA's action with:
   - State HOA statutes
   - The CC&Rs provisions cited
   - Required procedures for notices, hearings, and fines
4. Identify any procedural failures or overreach by the HOA
5. Draft a formal response that:
   - Addresses each point in the HOA notice
   - Cites specific state law protections
   - References relevant CC&R provisions
   - Requests specific remedies (hearing, reversal, mediation)
   - Notes the homeowner's rights under state law
6. Include escalation path: internal appeal → mediation → small claims → civil court

Use web search to verify current {{state}} HOA statutes and case law.`,
  requiredTools: HOUSING_REQUIRED_TOOLS,
  preferredModel: HOUSING_PREFERRED_MODEL,
  maxSteps: 15,
  requiredVariables: ["state", "hoa_name", "issue_type"],
  contextSuffix: HOUSING_MEMORY_SUFFIX,
};
