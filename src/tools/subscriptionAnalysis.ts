/**
 * Subscription analysis tools for the chat system.
 *
 * Two structured checkpoints for subscription/recurring-charge analysis:
 *
 * 1. `analyze_subscriptions` — validates extracted subscriptions, normalizes
 *    billing frequencies to monthly/annual amounts, and computes totals by
 *    category. Deterministic math replaces LLM arithmetic.
 *
 * 2. `flag_subscriptions` — validates flags (suspicious, duplicate, unused,
 *    etc.) and computes total potential savings.
 *
 * @example
 * ```typescript
 * import { createSubscriptionAnalysisTools } from "@anuma/sdk/tools";
 *
 * const tools = createSubscriptionAnalysisTools();
 *
 * await sendMessage({
 *   messages: [...],
 *   model: "gpt-4.1",
 *   tools,
 * });
 * ```
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;
export type SubscriptionFrequency = (typeof SUBSCRIPTION_FREQUENCIES)[number];

export const SUBSCRIPTION_CATEGORIES = [
  "streaming",
  "software",
  "insurance",
  "fitness",
  "food_delivery",
  "news_media",
  "gaming",
  "finance",
  "other",
] as const;
export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number];

export const SUBSCRIPTION_FLAG_TYPES = [
  "suspicious",
  "duplicate",
  "price_increase",
  "trial_conversion",
  "likely_unused",
] as const;
export type SubscriptionFlagType = (typeof SUBSCRIPTION_FLAG_TYPES)[number];

export interface SubscriptionItem {
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  category: SubscriptionCategory;
}

export interface NormalizedSubscription extends SubscriptionItem {
  monthly_amount: number;
  annual_amount: number;
}

export interface CategoryTotal {
  monthly: number;
  annual: number;
  count: number;
}

export interface AnalyzeSubscriptionsResult {
  subscriptions: NormalizedSubscription[];
  totals: {
    monthly: number;
    annual: number;
    by_category: Record<string, CategoryTotal>;
  };
  subscription_count: number;
}

export interface SubscriptionFlag {
  name: string;
  type: SubscriptionFlagType;
  detail: string;
  monthly_saving?: number;
  alternative?: string;
  cancellation_url?: string;
}

export interface FlagSubscriptionsResult {
  flags: SubscriptionFlag[];
  summary: {
    total_flags: number;
    by_type: Record<string, number>;
    total_potential_monthly_savings: number;
    total_potential_annual_savings: number;
  };
}

// ---------------------------------------------------------------------------
// Frequency normalization
// ---------------------------------------------------------------------------

/** Multiplier to convert a given frequency to a monthly amount. */
const TO_MONTHLY: Record<SubscriptionFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  annual: 1 / 12,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const ANALYZE_SUBSCRIPTIONS_SCHEMA = {
  name: "analyze_subscriptions",
  description:
    "Validate extracted subscriptions, normalize billing frequencies to monthly/annual amounts, and compute totals by category. Call this after parsing the statement.",
  parameters: {
    type: "object",
    properties: {
      subscriptions: {
        type: "array",
        description: "Subscriptions extracted from the statement.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Service or merchant name." },
            amount: {
              type: "number",
              description: "Charge amount as shown on the statement.",
            },
            frequency: {
              type: "string",
              enum: SUBSCRIPTION_FREQUENCIES,
              description: "Billing frequency.",
            },
            category: {
              type: "string",
              enum: SUBSCRIPTION_CATEGORIES,
              description: "Subscription category.",
            },
          },
          required: ["name", "amount", "frequency", "category"],
        },
      },
    },
    required: ["subscriptions"],
  },
} as const;

export const FLAG_SUBSCRIPTIONS_SCHEMA = {
  name: "flag_subscriptions",
  description:
    "Submit flags and savings recommendations for analyzed subscriptions. Call this after researching cancellation options.",
  parameters: {
    type: "object",
    properties: {
      flags: {
        type: "array",
        description: "Flagged subscriptions with reasons and potential savings.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Subscription name (must match a name from analyze_subscriptions).",
            },
            type: {
              type: "string",
              enum: SUBSCRIPTION_FLAG_TYPES,
              description: "Why this subscription is flagged.",
            },
            detail: { type: "string", description: "Brief explanation." },
            monthly_saving: {
              type: "number",
              description: "Potential monthly saving if cancelled or switched.",
            },
            alternative: {
              type: "string",
              description: "Cheaper or free alternative, if any.",
            },
            cancellation_url: {
              type: "string",
              description: "Direct cancellation URL found via web search.",
            },
          },
          required: ["name", "type", "detail"],
        },
      },
    },
    required: ["flags"],
  },
} as const;

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------

function executeAnalyzeSubscriptions(
  args: Record<string, unknown>
): AnalyzeSubscriptionsResult | { error: string; details?: string[] } {
  const items = args.subscriptions as SubscriptionItem[] | undefined;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "subscriptions array is required and must not be empty" };
  }

  const errors: string[] = [];
  const normalized: NormalizedSubscription[] = items.map((item, i) => {
    if (!item.name) errors.push(`Item ${i}: missing name`);
    if (typeof item.amount !== "number" || item.amount < 0) {
      errors.push(`Item ${i} (${item.name}): amount must be a positive number`);
    }
    if (!SUBSCRIPTION_FREQUENCIES.includes(item.frequency as SubscriptionFrequency)) {
      errors.push(`Item ${i} (${item.name}): invalid frequency "${item.frequency}"`);
    }
    if (!SUBSCRIPTION_CATEGORIES.includes(item.category as SubscriptionCategory)) {
      errors.push(`Item ${i} (${item.name}): invalid category "${item.category}"`);
    }

    const multiplier = TO_MONTHLY[item.frequency as SubscriptionFrequency] ?? 1;
    const monthly = round2(item.amount * multiplier);
    const annual = round2(monthly * 12);

    return { ...item, monthly_amount: monthly, annual_amount: annual };
  });

  if (errors.length > 0) {
    return { error: "Validation failed", details: errors };
  }

  const byCategory: Record<string, CategoryTotal> = {};
  let totalMonthly = 0;
  let totalAnnual = 0;

  for (const sub of normalized) {
    totalMonthly += sub.monthly_amount;
    totalAnnual += sub.annual_amount;

    const cat = byCategory[sub.category] ?? { monthly: 0, annual: 0, count: 0 };
    cat.monthly += sub.monthly_amount;
    cat.annual += sub.annual_amount;
    cat.count += 1;
    byCategory[sub.category] = cat;
  }

  for (const cat of Object.values(byCategory)) {
    cat.monthly = round2(cat.monthly);
    cat.annual = round2(cat.annual);
  }

  return {
    subscriptions: normalized,
    totals: {
      monthly: round2(totalMonthly),
      annual: round2(totalAnnual),
      by_category: byCategory,
    },
    subscription_count: normalized.length,
  };
}

function executeFlagSubscriptions(
  args: Record<string, unknown>
): FlagSubscriptionsResult | { error: string; details?: string[] } {
  const flags = args.flags as SubscriptionFlag[] | undefined;
  if (!Array.isArray(flags)) {
    return { error: "flags array is required" };
  }

  if (flags.length === 0) {
    return {
      flags: [],
      summary: {
        total_flags: 0,
        by_type: {},
        total_potential_monthly_savings: 0,
        total_potential_annual_savings: 0,
      },
    };
  }

  const errors: string[] = [];
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i]!;
    if (!f.name) errors.push(`Flag ${i}: missing name`);
    if (!SUBSCRIPTION_FLAG_TYPES.includes(f.type as SubscriptionFlagType)) {
      errors.push(`Flag ${i} (${f.name}): invalid type "${f.type}"`);
    }
    if (!f.detail) errors.push(`Flag ${i} (${f.name}): missing detail`);
  }

  if (errors.length > 0) {
    return { error: "Validation failed", details: errors };
  }

  const byType: Record<string, number> = {};
  let totalMonthlySavings = 0;

  for (const f of flags) {
    byType[f.type] = (byType[f.type] ?? 0) + 1;
    if (typeof f.monthly_saving === "number" && f.monthly_saving > 0) {
      totalMonthlySavings += f.monthly_saving;
    }
  }

  return {
    flags,
    summary: {
      total_flags: flags.length,
      by_type: byType,
      total_potential_monthly_savings: round2(totalMonthlySavings),
      total_potential_annual_savings: round2(totalMonthlySavings * 12),
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates the subscription analysis tools (analyze_subscriptions, flag_subscriptions).
 *
 * These tools act as structured checkpoints during subscription analysis:
 * the LLM extracts data and passes it through tool calls that validate
 * the schema and perform deterministic computation.
 */
export function createSubscriptionAnalysisTools(): ToolConfig[] {
  return [
    {
      type: "function",
      function: ANALYZE_SUBSCRIPTIONS_SCHEMA,
      executor: executeAnalyzeSubscriptions,
    },
    {
      type: "function",
      function: FLAG_SUBSCRIPTIONS_SCHEMA,
      executor: executeFlagSubscriptions,
    },
  ];
}
