import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionEvent {
  type: string;
  timestamp: string;
  toolUseCount: number;
  isSubagent: boolean;
  humanChars: number;
  isUserMessage: boolean;
}

export interface ParsedSession {
  id: string;
  source: 'claude' | 'codex';
  events: SessionEvent[];
  startTime: Date;
  endTime: Date;
}

export interface ScanOptions {
  lastN?: number;
  days?: number;
}

function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function safeReaddir(p: string): string[] {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function getClaudeSessionFiles(cutoff: Date): string[] {
  const claudeBase = path.join(os.homedir(), '.claude', 'projects');
  if (!safeStat(claudeBase)?.isDirectory()) return [];

  const files: string[] = [];
  for (const proj of safeReaddir(claudeBase)) {
    const projPath = path.join(claudeBase, proj);
    if (!safeStat(projPath)?.isDirectory()) continue;
    for (const entry of safeReaddir(projPath)) {
      if (!entry.endsWith('.jsonl') || entry === 'sessions-index.json') continue;
      const filePath = path.join(projPath, entry);
      const st = safeStat(filePath);
      if (st && st.mtime >= cutoff) files.push(filePath);
    }
  }
  return files;
}

function getCodexSessionFiles(cutoff: Date): string[] {
  const codexHome = process.env.CODEX_HOME ?? os.homedir();
  const codexBase = path.join(codexHome, '.codex', 'sessions');
  if (!safeStat(codexBase)?.isDirectory()) return [];

  const files: string[] = [];
  for (const year of safeReaddir(codexBase)) {
    const yearPath = path.join(codexBase, year);
    if (!safeStat(yearPath)?.isDirectory()) continue;
    for (const month of safeReaddir(yearPath)) {
      const monthPath = path.join(yearPath, month);
      if (!safeStat(monthPath)?.isDirectory()) continue;
      for (const day of safeReaddir(monthPath)) {
        const dayPath = path.join(monthPath, day);
        if (!safeStat(dayPath)?.isDirectory()) continue;
        for (const entry of safeReaddir(dayPath)) {
          if (!entry.endsWith('.jsonl')) continue;
          const filePath = path.join(dayPath, entry);
          const st = safeStat(filePath);
          if (st && st.mtime >= cutoff) files.push(filePath);
        }
      }
    }
  }
  return files;
}

function parseClaudeJSONL(filePath: string, sessionId: string): ParsedSession | null {
  const events: SessionEvent[] = [];
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      const type: string = obj.type ?? obj.event_type ?? 'unknown';
      const timestamp: string = obj.timestamp ?? obj.created_at ?? '';

      let toolUseCount = 0;
      let isSubagent = false;
      let humanChars = 0;
      let isUserMessage = false;

      if (type === 'user') {
        isUserMessage = true;
        const contentArr = obj.message?.content;
        if (Array.isArray(contentArr)) {
          for (const block of contentArr) {
            if (block.type === 'text' && typeof block.text === 'string') {
              humanChars += block.text.length;
            }
          }
        }
      }

      if (type === 'assistant') {
        const contentArr = obj.message?.content;
        if (Array.isArray(contentArr)) {
          for (const block of contentArr) {
            if (block.type === 'tool_use') {
              toolUseCount++;
              const name: string = block.name ?? '';
              if (name === 'Agent' || name === 'spawn_agent' || name.toLowerCase().includes('agent')) {
                isSubagent = true;
              }
            }
          }
        }
      }

      events.push({ type, timestamp, toolUseCount, isSubagent, humanChars, isUserMessage });
    } catch {
      // skip malformed lines
    }
  }

  if (!events.length) return null;

  const timestamps = events.map((e) => e.timestamp).filter(Boolean).map((t) => new Date(t).getTime()).filter((n) => !isNaN(n));

  const startTime = timestamps.length ? new Date(Math.min(...timestamps)) : new Date();
  const endTime = timestamps.length ? new Date(Math.max(...timestamps)) : new Date();

  return { id: sessionId, source: 'claude', events, startTime, endTime };
}

function parseCodexJSONL(filePath: string, sessionId: string): ParsedSession | null {
  const events: SessionEvent[] = [];
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      const timestamp: string = obj.ts ?? obj.timestamp ?? obj.created_at ?? '';
      const type: string = obj.type ?? 'unknown';

      let toolUseCount = 0;
      const isSubagent = false;
      let humanChars = 0;
      let isUserMessage = false;

      if (type === 'tool_call' || type === 'tool_use' || obj.tool) {
        toolUseCount = 1;
      }

      if (type === 'user' || type === 'input') {
        isUserMessage = true;
        if (typeof obj.input === 'string') humanChars = obj.input.length;
      }

      if (Array.isArray(obj.tool_calls)) {
        toolUseCount += obj.tool_calls.length;
      }

      events.push({ type, timestamp, toolUseCount, isSubagent, humanChars, isUserMessage });
    } catch {
      // skip malformed lines
    }
  }

  if (!events.length) return null;

  const timestamps = events.map((e) => e.timestamp).filter(Boolean).map((t) => new Date(t).getTime()).filter((n) => !isNaN(n));

  const startTime = timestamps.length ? new Date(Math.min(...timestamps)) : new Date();
  const endTime = timestamps.length ? new Date(Math.max(...timestamps)) : new Date();

  return { id: sessionId, source: 'codex', events, startTime, endTime };
}

export async function scan(opts: ScanOptions = {}): Promise<ParsedSession[]> {
  const days = opts.days ?? 7;
  const lastN = opts.lastN ?? 50;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const claudeFiles = getClaudeSessionFiles(cutoff);
  const codexFiles = getCodexSessionFiles(cutoff);

  const sessions: ParsedSession[] = [];

  for (const filePath of claudeFiles) {
    const sessionId = path.basename(filePath, '.jsonl');
    const session = parseClaudeJSONL(filePath, sessionId);
    if (session) sessions.push(session);
  }

  for (const filePath of codexFiles) {
    const sessionId = path.basename(filePath, '.jsonl');
    const session = parseCodexJSONL(filePath, sessionId);
    if (session) sessions.push(session);
  }

  // Sort by start time descending, take lastN
  sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  return sessions.slice(0, lastN);
}
