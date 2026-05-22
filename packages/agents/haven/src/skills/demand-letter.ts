import type { SkillConfig } from "@anuma/sdk";

import { HOUSING_MEMORY_SUFFIX, HOUSING_PREFERRED_MODEL, HOUSING_REQUIRED_TOOLS } from "./shared";

export const demandLetter: SkillConfig = {
  id: "housing.demand-letter",
  name: "Demand Letter Generator",
  promptTemplate: `You are a tenant rights attorney drafting a formal demand letter.

## Task
Draft a demand letter for a housing issue.

## Issue
{{issue_description}}

## Supporting documentation (if provided)
{{supporting_document_text}}

## Instructions
1. Research {{state}} landlord-tenant law relevant to this issue
2. Identify the specific legal violations or obligations
3. Draft a formal demand letter that:
   - States the facts clearly and chronologically
   - Cites specific {{state}} statutes that apply
   - Clearly states what is being demanded
   - Sets a reasonable deadline for response (per state law requirements)
   - Notes potential legal remedies if demands are not met
   - Maintains a professional, firm tone
4. Include proper formatting: date, addresses, RE line, signature block
5. Add a brief legal analysis section explaining the tenant's rights

Use web search to verify current {{state}} statutes and remedies.`,
  userTemplate: `Please draft a demand letter for the following housing issue:

- Tenant name: {{tenant_name}}
- Landlord/management: {{landlord_name}}
- Property address: {{property_address}}
- State: {{state}}
- Issue: {{issue_description}}
- Desired resolution: {{desired_resolution}}
- Prior communication: {{prior_communication}}

## Supporting documentation (if provided)
{{supporting_document_text}}`,
  requiredTools: HOUSING_REQUIRED_TOOLS,
  preferredModel: HOUSING_PREFERRED_MODEL,
  maxSteps: 12,
  requiredVariables: [
    "tenant_name",
    "landlord_name",
    "property_address",
    "state",
    "issue_description",
  ],
  smsPrompts: {
    tenant_name: "What's your full name (the tenant)?",
    landlord_name: "What's the landlord or property manager's name?",
    property_address: "What's the property address?",
    state: "What state is the property in?",
    issue_description:
      "Describe the issue you want to address — include the timeline, any prior requests, and the outcome you want.",
  },
  contextSuffix: HOUSING_MEMORY_SUFFIX,
  iconName: "FileText",
  preamble:
    "Got it — a demand letter. I'll ask a few quick questions about the situation, then draft a first version you can edit right here in chat. Let's start:",
  closing:
    "Perfect — drafting your letter now. Give me about 10 seconds and the first version will appear below.",
  requiredNudgeDefault: "I do need this one to draft the letter — what would you like to put?",
};
