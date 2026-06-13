import { describe, it, expect } from 'vitest';
import { buildPayload, getDeviceHash } from '../submit';
import { computeMetrics } from '../metrics';

const emptyMetrics = computeMetrics([]);

describe('buildPayload', () => {
  it('payload excludes session content (no prompt text, no message body)', () => {
    const payload = buildPayload({ metrics: emptyMetrics, profile: 'Hand-Coder', handle: 'test' });
    const serialized = JSON.stringify(payload);
    // Must carry only numeric scores — no session content, no prompt text, no message body
    expect(serialized).not.toMatch(/messageText|promptBody|sessionContent|messageBody/);
    expect(payload).not.toHaveProperty('messages');
    expect(payload).not.toHaveProperty('content');
    expect(payload).not.toHaveProperty('prompt');
  });

  it('payload contains only numeric scores and metadata', () => {
    const payload = buildPayload({ metrics: emptyMetrics, profile: 'Copilot Collaborator' });
    expect(typeof payload.scores.composite).toBe('number');
    expect(typeof payload.scores.parallelism).toBe('number');
    expect(typeof payload.scores.delegationDepth).toBe('number');
    expect(typeof payload.scores.handsOffRatio).toBe('number');
    expect(typeof payload.scores.runLength).toBe('number');
  });

  it('payload includes device hash for deduplication', () => {
    const payload = buildPayload({ metrics: emptyMetrics, profile: 'Hand-Coder' });
    expect(typeof payload.deviceHash).toBe('string');
    expect(payload.deviceHash.length).toBeGreaterThan(0);
  });

  it('payload scores are within 0-100 range', () => {
    const payload = buildPayload({ metrics: emptyMetrics, profile: 'Hand-Coder' });
    expect(payload.scores.composite).toBeGreaterThanOrEqual(0);
    expect(payload.scores.composite).toBeLessThanOrEqual(100);
  });
});

describe('getDeviceHash', () => {
  it('returns a consistent hex string', () => {
    const hash1 = getDeviceHash();
    const hash2 = getDeviceHash();
    expect(hash1).toBe(hash2);
    expect(/^[0-9a-f]+$/.test(hash1)).toBe(true);
  });
});
