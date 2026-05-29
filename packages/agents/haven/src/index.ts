import type { AgentConfig, AgentMarketplaceContent, AgentUiMetadata } from "@anuma/sdk";

import { HAVEN_PROMPT } from "./prompt";
import { HAVEN_SKILL_JOURNEYS } from "./journeys";
import { HAVEN_SKILLS } from "./skills";

export { HAVEN_PROMPT } from "./prompt";
export { HAVEN_SKILL_JOURNEYS } from "./journeys";
export { demandLetter, HAVEN_SKILLS, hoaDispute, leaseReview, rentIncreaseChecker } from "./skills";

/** Marketplace card content rendered in the agent picker. */
const HAVEN_MARKETPLACE: AgentMarketplaceContent = {
  family: "lifestyle",
  roleLabel: "Leasing agent",
  primaryActionLabel: "Start guided flow",
  primaryActionKind: "guided",
  cardUseCases: [
    "Review my lease for me",
    "Is my rent fair for this area?",
    "Flag anything unusual",
    "Respond to my landlord",
  ],
  cardKnowledge: ["Your uploaded leases", "US rental law database", "Local rent price data"],
  quickPrompts: [
    "What should I know before signing this lease?",
    "Is my rent price fair for this neighborhood?",
    "I got a notice from my landlord. Help me respond.",
  ],
  emptyStateDescription:
    "Your expert for everything renting. Haven knows leases, landlord law, rent prices, and your rights so you always know where you stand.",
  transcript: {
    kind: "analysis",
    userMessage: "Can you review my lease and look for any obvious red flags?",
    intro: "Reviewed it. Here are the things worth paying attention to before you sign.",
    sections: [
      {
        title: "Red flags",
        tone: "danger",
        items: [
          {
            title: "Landlord can enter with 12 hours notice",
            detail:
              "Most states require a minimum of 24 hours. This gives your landlord unusual access.",
          },
          {
            title: "No cap on annual rent increases",
            detail:
              "Many jurisdictions cap yearly increases or require notice. Without a cap, your rent can jump at renewal.",
          },
        ],
      },
      {
        title: "Worth negotiating",
        tone: "warning",
        items: [
          {
            title: "Security deposit is 3 months rent",
            detail: "Legal in your state but on the high end. 1 to 2 months is more standard.",
          },
          {
            title: "You are responsible for all appliance repairs",
            detail: "Landlords typically cover repairs for appliances they own. Worth clarifying.",
          },
        ],
      },
      {
        title: "Looks fine",
        tone: "success",
        items: [
          {
            title: "12 month term with standard renewal notice",
            detail: "60 days notice required from both sides. That's fair.",
          },
          {
            title: "Pet policy is clearly stated",
            detail: "One pet allowed, $50 monthly fee. No ambiguity.",
          },
        ],
      },
    ],
    followUp:
      "The entry notice clause is the most urgent. Want me to draft a message to your landlord asking them to change it?",
    actions: ["Draft A Message To Landlord", "Show Full Breakdown"],
  },
};

/** UI metadata used by renderers when richer portal data isn't available. */
const HAVEN_UI_METADATA: AgentUiMetadata = {
  color: "#C57741",
  icon: "users",
  features: [
    "agents.haven.feature1",
    "agents.haven.feature2",
    "agents.haven.feature3",
    "agents.haven.feature4",
  ],
  exampleConversations: [
    { userKey: "agents.haven.example1.user", agentKey: "agents.haven.example1.agent" },
    { userKey: "agents.haven.example2.user", agentKey: "agents.haven.example2.agent" },
  ],
};

const HAVEN_FIRST_TIME_DISCLAIMER = [
  "Anuma is not a law firm. {{agent_name}} is an AI tool. It does not provide legal advice, and using it does not create an attorney-client relationship.",
  "{{agent_name}} helps you prepare documents and take action based on information you provide. Results depend on the accuracy of your inputs and on applicable law in your jurisdiction, which varies. Anuma makes no guarantee of any particular outcome.",
  "Documents you upload are processed to generate your results. See our Privacy Policy for details.",
].join("\n\n");

const HAVEN_PERSISTENT_FOOTER =
  "{{agent_name}} is an AI. This is not legal advice. There is no attorney-client relationship. Results vary by jurisdiction. Learn more.";

/** Haven housing agent configuration. */
export const havenAgent: AgentConfig = {
  id: "haven",
  runtimes: ["server"],
  prompt: HAVEN_PROMPT,
  skills: HAVEN_SKILLS,
  tools: [],
  model: {
    default: "anthropic/claude-sonnet-4-6",
    allowed: ["anthropic/claude-sonnet-4-6"],
  },
  skillJourneys: HAVEN_SKILL_JOURNEYS,
  manifest: {
    id: "haven",
    name: "Haven",
    description: "AI-powered housing and tenant rights advisor",
    runtimes: ["server"],
    skills: HAVEN_SKILLS.map(({ id, name, requiredVariables, smsPrompts }) => ({
      id,
      name,
      requiredVariables,
      smsPrompts,
    })),
  },
  greeting: "Hi! My name is {{agent_name}}. What can I help you with today?",
  guidedFlowSubcopy:
    "{{agent_name}} will guide you step by step, ask for documents when needed, and then open the result directly in chat so you can keep refining it.",
  marketplace: HAVEN_MARKETPLACE,
  uiMetadata: HAVEN_UI_METADATA,
  firstTimeDisclaimer: HAVEN_FIRST_TIME_DISCLAIMER,
  persistentFooter: HAVEN_PERSISTENT_FOOTER,
};
