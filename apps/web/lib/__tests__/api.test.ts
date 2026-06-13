import { describe, it, expect } from 'vitest';
import { validateSubmitPayload, normalizeScore, ValidationError } from '../validation';

describe('validateSubmitPayload', () => {
  it('accepts a valid minimal payload', () => {
    const result = validateSubmitPayload({ handle: 'tester', score: 42, profile: 'test' });
    expect(result.handle).toBe('tester');
    expect(result.score).toBe(42);
  });

  it('rejects missing handle', () => {
    expect(() => validateSubmitPayload({ score: 50, profile: 'test' })).toThrow(ValidationError);
  });

  it('rejects empty handle', () => {
    expect(() => validateSubmitPayload({ handle: '  ', score: 50, profile: 'test' })).toThrow(ValidationError);
  });

  it('rejects missing score', () => {
    expect(() => validateSubmitPayload({ handle: 'x', profile: 'test' })).toThrow(ValidationError);
  });

  it('rejects missing profile', () => {
    expect(() => validateSubmitPayload({ handle: 'x', score: 50 })).toThrow(ValidationError);
  });

  it('rejects non-object body', () => {
    expect(() => validateSubmitPayload('string')).toThrow(ValidationError);
    expect(() => validateSubmitPayload(null)).toThrow(ValidationError);
  });

  it('passes optional numeric axis scores through', () => {
    const result = validateSubmitPayload({
      handle: 'h',
      score: 70,
      profile: 'p',
      parallelism_score: 80,
      delegation_score: 60,
    });
    expect(result.parallelism_score).toBe(80);
    expect(result.delegation_score).toBe(60);
  });
});

describe('normalizeScore', () => {
  it('clamps score above 100 to 100', () => {
    expect(normalizeScore(150)).toBe(100);
  });

  it('clamps score below 0 to 0', () => {
    expect(normalizeScore(-5)).toBe(0);
  });

  it('passes through valid score unchanged', () => {
    expect(normalizeScore(55)).toBe(55);
  });

  it('throws on non-numeric input', () => {
    expect(() => normalizeScore('abc')).toThrow(ValidationError);
  });
});
