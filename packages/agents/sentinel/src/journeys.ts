import type { SkillJourneyDefinition } from "@anuma/sdk";

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

function outputFormatBlock(lengthGuidance: string): string[] {
  return [
    "",
    "## Output format",
    "Lead with a 2–3 sentence executive summary.",
    "Use ## headings to separate major sections.",
    "Keep each finding to 2–4 lines: state the issue, cite the law, and give the risk level.",
    "Use tables only when comparing items (e.g. fees, costs). Avoid decorative tables.",
    "End with a prioritized action list — most urgent first.",
    lengthGuidance,
  ];
}

export const SENTINEL_SKILL_JOURNEYS: Record<string, SkillJourneyDefinition> = {
  "finance.subscription-checker": {
    title: "Subscription audit",
    description:
      "Sentinel scans a statement, renewal list, or connected-bank import to find recurring charges and cancellation targets.",
    steps: [
      "Upload a statement, connect a bank, or paste transactions.",
      "Optionally call out vendors to review first.",
      "Get a clean findings summary in chat.",
    ],
    acceptsFiles: true,
    fileLabel: "Upload a billing PDF or statement (optional if you connect a bank)",
    fileHint:
      "Attach a PDF, CSV, screenshot, or connect a bank with Plaid to import recurring charges directly.",
    filePrompt:
      "Upload a statement, connect a bank with Plaid, or continue to paste transactions manually.",
    fileExtraction: {
      strategy: "pdf-text",
      targetField: "statement_text",
      missingInputError:
        "Paste statement text, connect a bank, or upload an extractable statement before running this audit.",
      unreadableInputError:
        "Sentinel cannot read that statement type yet. Upload a PDF/text file, connect a bank, or paste transactions.",
    },
    fields: [
      {
        key: "statement_text",
        label: "Paste your statement or subscription list",
        placeholder:
          "Paste transactions, renewal emails, or a list of recurring services you want Sentinel to audit.",
        helper:
          "Use this if you do not have a PDF handy, or add extra context alongside the uploaded file.",
        type: "textarea",
        required: false,
      },
      {
        key: "focus_vendors",
        label: "Vendors or charges to prioritize",
        placeholder: "Netflix, Apple, Amazon, duplicate gym charges",
        helper: "Optional. Sentinel will still scan everything if you leave this blank.",
        type: "text",
        required: false,
      },
    ],
    requiresContext: true,
    submitLabel: "Run in Sentinel chat",
    promptTitle: "Check this statement for duplicate or overlapping subscriptions",
    systemContext: [
      "Analyze the statement for:",
      "1. Duplicate or overlapping subscriptions",
      "2. Price increases since sign-up",
      "3. Services that may no longer be used",
      "4. Free alternatives available",
      "",
      "For each finding, show the monthly and annual cost impact.",
      "End with total potential savings.",
      ...outputFormatBlock(
        "Target 400–800 words. Use a table to show each finding with monthly/annual cost."
      ),
    ].join("\n"),
  },
  "finance.chargeback-assistant": {
    title: "Chargeback case builder",
    description:
      "Sentinel turns a suspicious charge and any supporting evidence into a dispute plan, bank script, and next-step checklist.",
    steps: [
      "Share the disputed charge and what happened.",
      "Attach receipts, merchant emails, or screenshots.",
      "Review the dispute strategy in chat.",
    ],
    acceptsFiles: true,
    fileLabel: "Upload receipts or charge evidence",
    fileHint:
      "Attach billing PDFs, order confirmations, emails, or screenshots that support the dispute.",
    fileExtraction: {
      strategy: "pdf-text",
      targetField: "charge_details",
      missingInputError:
        "Describe the charge or upload extractable evidence before building a dispute case.",
      unreadableInputError:
        "Sentinel cannot read that evidence type yet. Upload a PDF/text file or describe the charge.",
    },
    fields: [
      {
        key: "charge_details",
        label: "What happened with this charge?",
        placeholder:
          "Describe the merchant, amount, date, why the charge is wrong, and what outcome you want.",
        helper: "The more context you provide, the sharper Sentinel can make the dispute plan.",
        type: "textarea",
        required: true,
      },
      {
        key: "merchant_name",
        label: "Merchant",
        placeholder: "Merchant name or descriptor on your statement",
        helper: "Optional if already included in the explanation above.",
        type: "text",
        required: false,
      },
      {
        key: "charge_amount",
        label: "Charge amount",
        placeholder: "$124.00",
        helper: "Optional, but helpful for drafting the bank script.",
        type: "text",
        required: false,
      },
    ],
    requiresContext: true,
    submitLabel: "Build dispute in chat",
    promptTitle: "Help me build a chargeback case for this transaction",
    systemContext: [
      "Build a chargeback case with:",
      "1. Which chargeback reason code applies",
      "2. Required evidence to gather",
      "3. A timeline of events",
      "4. Draft dispute letter to the bank",
      "",
      "Be specific about deadlines and required documentation.",
      ...outputFormatBlock("Target 600–1000 words. Be precise, not exhaustive."),
    ].join("\n"),
  },
  "finance.collection-response": {
    title: "Collections response",
    description:
      "Sentinel reviews a collections notice and drafts a clear reply, validation request, or escalation strategy.",
    steps: [
      "Paste the collections notice or upload the letter.",
      "Add your state and any account details you know.",
      "Get a response draft and risk summary in chat.",
    ],
    acceptsFiles: true,
    fileLabel: "Upload the collection notice",
    fileHint: "Letters, PDFs, and screenshots work. You can also paste the notice text below.",
    fileExtraction: {
      strategy: "pdf-text",
      targetField: "collection_notice",
      missingInputError:
        "Paste the collection notice or upload an extractable PDF/text file before drafting a response.",
      unreadableInputError:
        "Sentinel cannot read that notice type yet. Upload a PDF/text file or paste the notice.",
    },
    fields: [
      {
        key: "collection_notice",
        label: "Paste the collection notice",
        placeholder: "Paste the letter or message from the collector.",
        helper:
          "If you upload the notice, this can stay blank unless you want to highlight specific lines.",
        type: "textarea",
        required: false,
      },
      {
        key: "collector_name",
        label: "Collector or agency name",
        placeholder: "Agency name",
        helper: "Optional if it is clearly visible in the uploaded notice.",
        type: "text",
        required: false,
      },
      {
        key: "state",
        label: "Your U.S. state",
        placeholder: "Select your U.S. state",
        helper: "Required for the statute of limitations check and state-specific debt rules.",
        type: "select",
        required: true,
        options: US_STATES,
      },
    ],
    requiresContext: true,
    submitLabel: "Draft response in chat",
    promptTitle: "Review this collection notice and draft my response options",
    systemContext: [
      "Review the collection notice and provide:",
      "1. Whether the debt appears valid",
      "2. Statute of limitations check for the state",
      "3. Consumer rights under FDCPA",
      "4. Response options (validate, dispute, negotiate, pay)",
      "5. Draft response letter if disputing",
      "",
      "Flag any potential violations by the collector.",
      ...outputFormatBlock("Target 600–1000 words. Be precise, not exhaustive."),
    ].join("\n"),
  },
};
