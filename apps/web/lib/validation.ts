export interface SubmitBody {
  handle: string;
  score: number;
  profile: string;
  device_hash?: string | null;
  parallelism_score?: number | null;
  delegation_score?: number | null;
  hands_off_score?: number | null;
  run_length_score?: number | null;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function normalizeScore(value: unknown): number {
  const n = Number(value);
  if (isNaN(n)) throw new ValidationError('score must be a number');
  return Math.max(0, Math.min(100, n));
}

export function validateSubmitPayload(body: unknown): SubmitBody {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const obj = body as Record<string, unknown>;

  if (!obj.handle || typeof obj.handle !== 'string' || obj.handle.trim().length === 0) {
    throw new ValidationError('handle is required and must be a non-empty string');
  }

  if (obj.score === undefined || obj.score === null) {
    throw new ValidationError('score is required');
  }

  const score = normalizeScore(obj.score);

  if (!obj.profile || typeof obj.profile !== 'string') {
    throw new ValidationError('profile is required and must be a string');
  }

  return {
    handle: String(obj.handle).trim().slice(0, 64),
    score,
    profile: String(obj.profile).slice(0, 64),
    device_hash: obj.device_hash ? String(obj.device_hash).slice(0, 64) : null,
    parallelism_score: obj.parallelism_score != null ? normalizeScore(obj.parallelism_score) : null,
    delegation_score: obj.delegation_score != null ? normalizeScore(obj.delegation_score) : null,
    hands_off_score: obj.hands_off_score != null ? normalizeScore(obj.hands_off_score) : null,
    run_length_score: obj.run_length_score != null ? normalizeScore(obj.run_length_score) : null,
  };
}
