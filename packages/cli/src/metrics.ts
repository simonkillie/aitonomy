import { ParsedSession } from './scanner';

export interface Metrics {
  parallelism: number;
  delegationDepth: number;
  handsOffRatio: number;
  runLength: number;
  composite: number;
  toolTypeCounts: Record<string, number>;
  sessionCount: number;
  timeWindow: { start: string; end: string };
}

export function normalizeParallelism(peakConcurrent: number): number {
  // log2-scaled; 8-10 concurrent sessions saturates at 100
  return Math.min(100, Math.log2(peakConcurrent + 1) * 30);
}

export function normalizeDelegationDepth(toolsPerTurn: number, subagentFanout: number): number {
  const raw = toolsPerTurn * Math.max(1, subagentFanout);
  return Math.min(100, raw * 10);
}

export function normalizeHandsOffRatio(humanCharsPerToolCall: number): number {
  // Exponential decay: 0 chars/tool => 100, many chars => 0
  if (humanCharsPerToolCall <= 0) return 100;
  return Math.min(100, Math.exp(-humanCharsPerToolCall / 50) * 100);
}

export function normalizeRunLength(meanStreakMinutes: number): number {
  // Saturates around 90 minutes
  return Math.min(100, (meanStreakMinutes / 1.5));
}

const IDLE_GAP_MS = 30 * 60 * 1000; // 30-minute idle gap separates activity windows

function getActivityWindows(session: ParsedSession): Array<{ start: number; end: number }> {
  const times = session.events
    .map(e => new Date(e.timestamp).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => a - b);

  if (!times.length) return [];

  const windows: Array<{ start: number; end: number }> = [];
  let winStart = times[0];
  let winEnd = times[0];

  for (let i = 1; i < times.length; i++) {
    if (times[i] - winEnd > IDLE_GAP_MS) {
      windows.push({ start: winStart, end: winEnd });
      winStart = times[i];
    }
    winEnd = times[i];
  }
  windows.push({ start: winStart, end: winEnd });
  return windows;
}

function computePeakConcurrency(sessions: ParsedSession[]): number {
  // Use activity windows rather than full session spans — a session open for weeks
  // but idle shouldn't count as concurrent with sessions active today.
  const events: { time: number; delta: number }[] = [];
  for (const s of sessions) {
    for (const w of getActivityWindows(s)) {
      events.push({ time: w.start, delta: 1 });
      events.push({ time: w.end, delta: -1 });
    }
  }
  events.sort((a, b) => a.time - b.time || b.delta - a.delta);

  let peak = 0;
  let current = 0;
  for (const e of events) {
    current += e.delta;
    if (current > peak) peak = current;
  }
  return peak;
}

function computeDelegation(sessions: ParsedSession[]): { toolsPerTurn: number; subagentFanout: number } {
  let totalToolCalls = 0;
  let totalHumanTurns = 0;
  let subagentEvents = 0;
  let totalAssistantEvents = 0;

  for (const s of sessions) {
    for (const e of s.events) {
      totalToolCalls += e.toolUseCount;
      if (e.isUserMessage) totalHumanTurns++;
      if (e.isSubagent) subagentEvents++;
      if (!e.isUserMessage && e.type === 'assistant') totalAssistantEvents++;
    }
  }

  const toolsPerTurn = totalHumanTurns > 0 ? totalToolCalls / totalHumanTurns : totalToolCalls > 0 ? totalToolCalls : 0;
  const subagentFanout = totalAssistantEvents > 0 ? subagentEvents / totalAssistantEvents + 1 : 1;
  return { toolsPerTurn, subagentFanout };
}

function computeHandsOff(sessions: ParsedSession[]): number {
  let totalHumanChars = 0;
  let totalToolCalls = 0;

  for (const s of sessions) {
    for (const e of s.events) {
      totalHumanChars += e.humanChars;
      totalToolCalls += e.toolUseCount;
    }
  }

  if (totalToolCalls === 0) return 0;
  return totalHumanChars / totalToolCalls;
}

function computeMeanRunLength(sessions: ParsedSession[]): number {
  const streaks: number[] = [];

  for (const s of sessions) {
    let streakStart: Date | null = null;

    for (const e of s.events) {
      if (!e.timestamp) continue;
      const t = new Date(e.timestamp);
      if (isNaN(t.getTime())) continue;

      if (e.isUserMessage) {
        if (streakStart) {
          streaks.push((t.getTime() - streakStart.getTime()) / 60000);
          streakStart = null;
        }
      } else {
        if (!streakStart) streakStart = t;
      }
    }

    if (streakStart && s.endTime > streakStart) {
      streaks.push((s.endTime.getTime() - streakStart.getTime()) / 60000);
    }
  }

  if (!streaks.length) return 0;
  return streaks.reduce((a, b) => a + b, 0) / streaks.length;
}

export function computeMetrics(sessions: ParsedSession[]): Metrics {
  if (sessions.length === 0) {
    const now = new Date().toISOString();
    return {
      parallelism: 0,
      delegationDepth: 0,
      handsOffRatio: 0,
      runLength: 0,
      composite: 0,
      toolTypeCounts: {},
      sessionCount: 0,
      timeWindow: { start: now, end: now },
    };
  }

  const peak = computePeakConcurrency(sessions);
  const { toolsPerTurn, subagentFanout } = computeDelegation(sessions);
  const humanCharsPerTool = computeHandsOff(sessions);
  const meanStreak = computeMeanRunLength(sessions);

  const parallelism = normalizeParallelism(peak);
  const delegationDepth = normalizeDelegationDepth(toolsPerTurn, subagentFanout);
  const handsOffRatio = normalizeHandsOffRatio(humanCharsPerTool);
  const runLength = normalizeRunLength(meanStreak);

  const composite = Math.min(
    100,
    Math.max(
      0,
      parallelism * 0.4 + delegationDepth * 0.25 + handsOffRatio * 0.25 + runLength * 0.1,
    ),
  );

  const allTimes = sessions.flatMap((s) => [s.startTime, s.endTime]);
  const timeWindow =
    allTimes.length > 0
      ? {
          start: new Date(Math.min(...allTimes.map((d) => d.getTime()))).toISOString(),
          end: new Date(Math.max(...allTimes.map((d) => d.getTime()))).toISOString(),
        }
      : { start: new Date().toISOString(), end: new Date().toISOString() };

  return {
    parallelism,
    delegationDepth,
    handsOffRatio,
    runLength,
    composite,
    toolTypeCounts: {},
    sessionCount: sessions.length,
    timeWindow,
  };
}
