import type { AgentConfig } from "@anuma/sdk";
import { havenAgent } from "@anuma/agent-haven";
import { sentinelAgent } from "@anuma/agent-sentinel";

const AGENTS: Record<string, AgentConfig> = {
  haven: havenAgent,
  sentinel: sentinelAgent,
};

export function getAgent(agentId: string): AgentConfig | null {
  return AGENTS[agentId.toLowerCase()] ?? null;
}

export function listAgents(): AgentConfig[] {
  return Object.values(AGENTS);
}

export interface SkillMeta {
  id: string;
  name: string;
  requiredVariables: string[];
  smsPrompts?: Record<string, string>;
}

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
