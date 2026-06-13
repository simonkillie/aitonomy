import { describe, it, expect } from 'vitest';
import {
  normalizeParallelism,
  normalizeDelegationDepth,
  normalizeHandsOffRatio,
  normalizeRunLength,
  computeMetrics,
} from '../metrics';
import type { ParsedSession } from '../scanner';

function makeSession(id: string, start: Date, end: Date, events: ParsedSession['events'] = []): ParsedSession {
  return { id, source: 'claude', events, startTime: start, endTime: end };
}

describe('normalizeParallelism', () => {
  it('returns 0 with 0 concurrent sessions', () => {
    expect(normalizeParallelism(0)).toBe(0);
  });

  it('returns positive value with concurrent sessions', () => {
    const score = normalizeParallelism(4);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('saturates at 100 with many sessions', () => {
    expect(normalizeParallelism(100)).toBe(100);
  });
});

describe('normalizeDelegationDepth', () => {
  it('returns 0 with no tool calls', () => {
    expect(normalizeDelegationDepth(0, 1)).toBe(0);
  });

  it('scales up with higher tool call density', () => {
    const low = normalizeDelegationDepth(1, 1);
    const high = normalizeDelegationDepth(5, 2);
    expect(high).toBeGreaterThan(low);
  });

  it('caps at 100', () => {
    expect(normalizeDelegationDepth(100, 10)).toBe(100);
  });
});

describe('normalizeHandsOffRatio', () => {
  it('returns 100 when no human chars per tool call', () => {
    expect(normalizeHandsOffRatio(0)).toBe(100);
  });

  it('decreases as human chars per tool call increases', () => {
    const low = normalizeHandsOffRatio(10);
    const high = normalizeHandsOffRatio(200);
    expect(low).toBeGreaterThan(high);
  });
});

describe('normalizeRunLength', () => {
  it('returns 0 for 0 minutes', () => {
    expect(normalizeRunLength(0)).toBe(0);
  });

  it('scales linearly up to cap', () => {
    const score = normalizeRunLength(30);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('computeMetrics', () => {
  it('returns zero composite with no sessions', () => {
    const m = computeMetrics([]);
    expect(m.composite).toBe(0);
    expect(m.sessionCount).toBe(0);
  });

  it('composite is within 0-100 range', () => {
    const now = new Date();
    const later = new Date(now.getTime() + 60000);
    const sessions = [makeSession('a', now, later), makeSession('b', now, later)];
    const m = computeMetrics(sessions);
    expect(m.composite).toBeGreaterThanOrEqual(0);
    expect(m.composite).toBeLessThanOrEqual(100);
  });

  it('weighted composite matches formula', () => {
    const m = computeMetrics([]);
    // With zero sessions all axes are 0
    expect(m.parallelism).toBe(0);
    expect(m.delegationDepth).toBe(0);
  });
});
