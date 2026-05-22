import type { AgentConfig, AgentMarketplaceContent, AgentUiMetadata } from "@anuma/sdk";

import { SENTINEL_PROMPT } from "./prompt";
import { SENTINEL_SKILL_JOURNEYS } from "./journeys";
import { SENTINEL_SKILLS } from "./skills";

export { SENTINEL_PROMPT } from "./prompt";
export { SENTINEL_SKILL_JOURNEYS } from "./journeys";
export {
  chargebackAssistant,
  collectionResponse,
  SENTINEL_SKILLS,
  subscriptionChecker,
} from "./skills";

/** Marketplace card content rendered in the agent picker. */
const SENTINEL_MARKETPLACE: AgentMarketplaceContent = {
  family: "lifestyle",
  roleLabel: "Billing agent",
  primaryActionLabel: "Start guided flow",
  primaryActionKind: "guided",
  cardUseCases: ["Get a refund", "Cancel a subscription", "Dispute a charge"],
  cardKnowledge: ["Your billing history", "Receipts and invoices", "500+ company refund policies"],
  quickPrompts: [
    "What can I get refunded this month?",
    "Cancel my duplicate subscriptions",
    "Draft a dispute for this charge",
  ],
  emptyStateDescription: "Get what you deserve. Check if you are owed money.",
  transcript: {
    kind: "analysis",
    userMessage: "Can you check my recent charges for anything unusual?",
    intro: "I found a few things worth looking at more closely.",
    sections: [
      {
        title: "Likely savings",
        tone: "success",
        items: [
          {
            title: "Streaming service billed twice this month",
            detail: "The same merchant hit your card two days apart for the same amount.",
          },
          {
            title: "Annual software renewal jumped by 18%",
            detail: "That is higher than last year and worth disputing or negotiating.",
          },
        ],
      },
      {
        title: "Needs review",
        tone: "warning",
        items: [
          {
            title: "Gym membership charge arrived after your cancellation date",
            detail: "If you canceled before the billing cycle reset, this should be reversed.",
          },
        ],
      },
    ],
    followUp:
      "Want me to draft refund requests for the duplicate streaming charge and the gym billing issue?",
    actions: ["Draft Refund Requests", "Show Full Breakdown"],
  },
};

/** UI metadata used by renderers when richer portal data isn't available. */
const SENTINEL_UI_METADATA: AgentUiMetadata = {
  color: "#f97316",
  icon: "sparkles",
  features: [
    "agents.sentinel.feature1",
    "agents.sentinel.feature2",
    "agents.sentinel.feature3",
    "agents.sentinel.feature4",
  ],
  exampleConversations: [
    { userKey: "agents.sentinel.example1.user", agentKey: "agents.sentinel.example1.agent" },
    { userKey: "agents.sentinel.example2.user", agentKey: "agents.sentinel.example2.agent" },
    { userKey: "agents.sentinel.example3.user", agentKey: "agents.sentinel.example3.agent" },
  ],
};

/** Sentinel finance agent configuration. */
export const sentinelAgent: AgentConfig = {
  id: "sentinel",
  runtimes: ["server"],
  prompt: SENTINEL_PROMPT,
  skills: SENTINEL_SKILLS,
  tools: [],
  model: {
    default: "anthropic/claude-sonnet-4-6",
    allowed: ["anthropic/claude-sonnet-4-6"],
  },
  skillJourneys: SENTINEL_SKILL_JOURNEYS,
  manifest: {
    id: "sentinel",
    name: "Sentinel",
    description: "AI-powered billing analyst and money recovery advisor",
    runtimes: ["server"],
    skills: SENTINEL_SKILLS.map(({ id, name, requiredVariables, smsPrompts }) => ({
      id,
      name,
      requiredVariables,
      smsPrompts,
    })),
  },
  greeting:
    "Hi! My name is {{agent_name}}. I can help with billing disputes, recurring charges, and money recovery. What do you want to tackle first?",
  guidedFlowSubcopy:
    "{{agent_name}} will help you audit charges, build disputes, and organize evidence before moving everything into chat.",
  marketplace: SENTINEL_MARKETPLACE,
  uiMetadata: SENTINEL_UI_METADATA,
};
