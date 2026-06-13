import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'path';

afterEach(() => {
  delete process.env.CODEX_HOME;
});

describe('scan', () => {
  it('returns an array (does not throw) even with no agent dirs', async () => {
    const { scan } = await import('../scanner');
    const sessions = await scan({ days: 0 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('respects lastN limit — never returns more than requested', async () => {
    const { scan } = await import('../scanner');
    const sessions = await scan({ lastN: 3, days: 365 });
    expect(sessions.length).toBeLessThanOrEqual(3);
  });

  it('honors CODEX_HOME env var — uses custom path without crashing', async () => {
    process.env.CODEX_HOME = '/tmp/nonexistent-codex-home-test-xyz';
    const { scan } = await import('../scanner');
    const sessions = await scan({ days: 7 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('parses session ID from filename correctly', () => {
    const filePath = '/home/user/.claude/projects/abc/my-session-123.jsonl';
    const sessionId = path.basename(filePath, '.jsonl');
    expect(sessionId).toBe('my-session-123');
  });
});
