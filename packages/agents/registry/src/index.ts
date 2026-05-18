import type { AgentConfig } from "@anuma/sdk";
import { havenAgent } from "@anuma/agent-haven";
import { sentinelAgent } from "@anuma/agent-sentinel";

const AGENTS: Record<string, AgentConfig> = {
  haven: havenAgent,
  sentinel: sentinelAgent,
};

/** Look up an agent by id. Case-insensitive. Returns null when unknown. */
export function getAgent(agentId: string): AgentConfig | null {
  return AGENTS[agentId.toLowerCase()] ?? null;
}

/** All registered agents. Order is not guaranteed. */
export function listAgents(): AgentConfig[] {
  return Object.values(AGENTS);
}

/** Public-safe skill metadata returned by `getAgentSkillMeta`. */
export interface SkillMeta {
  id: string;
  name: string;
  requiredVariables: string[];
  /** SMS-friendly question prompts keyed by variable name, when available. */
  smsPrompts?: Record<string, string>;
}

/**
 * Look up skill metadata by (agentId, skillId). Returns null when either is
 * unknown. Use this when you only need `id` / `name` / `requiredVariables`
 * / `smsPrompts` — for the full SkillConfig (including templates), import
 * the agent package directly.
 */
export function getAgentSkillMeta(agentId: string, skillId: string): SkillMeta | null {
  const agent = getAgent(agentId);
  const skill = agent?.skills.find((s) => s.id === skillId);
  if (!skill) return null;
  return {
    id: skill.id,
    name: skill.name,
    requiredVariables: skill.requiredVariables ?? [],
    smsPrompts: skill.smsPrompts,
  };
}
