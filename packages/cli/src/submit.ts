import * as crypto from 'crypto';
import * as os from 'os';
import { Metrics } from './metrics';
import { Profile } from './profiles';

export interface SubmitPayload {
  handle: string;
  scores: {
    parallelism: number;
    delegationDepth: number;
    handsOffRatio: number;
    runLength: number;
    composite: number;
  };
  profile: Profile;
  toolTypeCounts: Record<string, number>;
  timeWindow: { start: string; end: string };
  deviceHash: string;
  sessionCount: number;
  clientType: string;
  username: string;
}

export function getDeviceHash(): string {
  const stable = `${os.hostname()}-${os.userInfo().username}-${process.platform}`;
  return crypto.createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

export function buildPayload(opts: {
  metrics: Metrics;
  profile: Profile;
  handle?: string;
  clientType?: string;
  username?: string;
}): SubmitPayload {
  const { metrics, profile, handle = 'anonymous', clientType = 'Claude Code', username = os.userInfo().username } = opts;

  // Payload carries only numeric scores — no session content, no prompt text, no message body
  return {
    handle,
    scores: {
      parallelism: Math.round(metrics.parallelism * 10) / 10,
      delegationDepth: Math.round(metrics.delegationDepth * 10) / 10,
      handsOffRatio: Math.round(metrics.handsOffRatio * 10) / 10,
      runLength: Math.round(metrics.runLength * 10) / 10,
      composite: Math.round(metrics.composite * 10) / 10,
    },
    profile,
    toolTypeCounts: metrics.toolTypeCounts,
    timeWindow: metrics.timeWindow,
    deviceHash: getDeviceHash(),
    sessionCount: metrics.sessionCount,
    clientType,
    username,
  };
}

export async function submitPayload(
  payload: SubmitPayload,
  endpoint = 'https://agentry-cli.vercel.app/api/submit',
): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle: payload.handle,
      score: payload.scores.composite,
      profile: payload.profile,
      device_hash: payload.deviceHash,
      parallelism_score: payload.scores.parallelism,
      delegation_score: payload.scores.delegationDepth,
      hands_off_score: payload.scores.handsOffRatio,
      run_length_score: payload.scores.runLength,
      client_type: payload.clientType,
      username: payload.username,
    }),
  });

  if (!response.ok) {
    throw new Error(`Submit failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<{ ok: boolean; message: string }>;
}
