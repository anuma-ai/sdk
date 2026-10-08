import type { AgentConfig } from "@anuma/sdk";
import { havenAgent } from "@anuma/agent-haven";
import { sentinelAgent } from "@anuma/agent-sentinel";

const AGENTS: Record<string, AgentConfig> = {
  haven: havenAgent,
  sentinel: sentinelAgent,
};

/** Look up an agent by id, case-insensitively; returns null when unknown. */
export function getAgent(agentId: string): AgentConfig | null {
  return AGENTS[agentId.toLowerCase()] ?? null;
}

/** All registered agents, in no guaranteed order. */
export function listAgents(): AgentConfig[] {
  return Object.values(AGENTS);
}

/** Public-safe skill metadata returned by {@link getAgentSkillMeta}. */
export interface SkillMeta {
  id: string;
  name: string;
  requiredVariables: string[];
  /** SMS-friendly question prompts keyed by variable name. */
  smsPrompts?: Record<string, string>;
}

/** Look up skill metadata by agent and skill id; returns null when either is unknown. Import the agent package for the full `SkillConfig`. */
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
