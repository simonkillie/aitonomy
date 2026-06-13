export type Profile =
  | 'Hand-Coder'
  | 'Copilot Collaborator'
  | 'Autonomous Operator'
  | 'Hands-Off Architect'
  | 'Fleet Orchestrator';

export const PROFILES: Array<{ name: Profile; min: number; max: number; description: string }> = [
  {
    name: 'Hand-Coder',
    min: 0,
    max: 19,
    description: 'Tight control, agents assist with routine tasks only',
  },
  {
    name: 'Copilot Collaborator',
    min: 20,
    max: 44,
    description: 'Iterative human-agent dialogue on feature implementation',
  },
  {
    name: 'Autonomous Operator',
    min: 45,
    max: 69,
    description: 'Delegates feature ownership with periodic oversight',
  },
  {
    name: 'Hands-Off Architect',
    min: 70,
    max: 84,
    description: 'Strategic planner steering agent swarms',
  },
  {
    name: 'Fleet Orchestrator',
    min: 85,
    max: 100,
    description: 'Manages agents as persistent managed resources',
  },
];

export function mapProfile(score: number): Profile {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < 20) return 'Hand-Coder';
  if (clamped < 45) return 'Copilot Collaborator';
  if (clamped < 70) return 'Autonomous Operator';
  if (clamped < 85) return 'Hands-Off Architect';
  return 'Fleet Orchestrator';
}

export function getProfileDescription(profile: Profile): string {
  return PROFILES.find((p) => p.name === profile)?.description ?? '';
}
