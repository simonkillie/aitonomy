import { neon } from '@neondatabase/serverless';

export interface Entry {
  id: number;
  handle: string;
  score: number;
  profile: string;
  device_hash: string | null;
  parallelism_score: number | null;
  delegation_score: number | null;
  hands_off_score: number | null;
  run_length_score: number | null;
  client_type: string | null;
  username: string | null;
  created_at: string;
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url, { fetchOptions: { cache: 'no-store' } });
}

async function ensureTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      handle TEXT NOT NULL,
      score NUMERIC(5,2) NOT NULL,
      profile TEXT NOT NULL,
      device_hash TEXT,
      parallelism_score NUMERIC(5,2),
      delegation_score NUMERIC(5,2),
      hands_off_score NUMERIC(5,2),
      run_length_score NUMERIC(5,2),
      client_type TEXT,
      username TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS client_type TEXT`;
  await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS username TEXT`;
  return sql;
}

export async function insertEntry(data: {
  handle: string;
  score: number;
  profile: string;
  device_hash?: string | null;
  parallelism_score?: number | null;
  delegation_score?: number | null;
  hands_off_score?: number | null;
  run_length_score?: number | null;
  client_type?: string | null;
  username?: string | null;
}): Promise<void> {
  const sql = await ensureTable();

  if (data.device_hash) {
    const existing = await sql`SELECT id FROM entries WHERE device_hash = ${data.device_hash}`;
    if (existing.length > 0) {
      await sql`
        UPDATE entries SET
          handle = ${data.handle},
          score = ${data.score},
          profile = ${data.profile},
          parallelism_score = ${data.parallelism_score ?? null},
          delegation_score = ${data.delegation_score ?? null},
          hands_off_score = ${data.hands_off_score ?? null},
          run_length_score = ${data.run_length_score ?? null},
          client_type = ${data.client_type ?? null},
          username = ${data.username ?? null},
          created_at = NOW()
        WHERE device_hash = ${data.device_hash}
      `;
      return;
    }
  }

  await sql`
    INSERT INTO entries (handle, score, profile, device_hash, parallelism_score, delegation_score, hands_off_score, run_length_score, client_type, username)
    VALUES (
      ${data.handle},
      ${data.score},
      ${data.profile},
      ${data.device_hash ?? null},
      ${data.parallelism_score ?? null},
      ${data.delegation_score ?? null},
      ${data.hands_off_score ?? null},
      ${data.run_length_score ?? null},
      ${data.client_type ?? null},
      ${data.username ?? null}
    )
  `;
}

export async function getLeaderboard(): Promise<Entry[]> {
  const sql = await ensureTable();
  const rows = await sql`
    SELECT id, handle, score, profile, device_hash, parallelism_score, delegation_score, hands_off_score, run_length_score, client_type, username, created_at
    FROM entries
    ORDER BY score DESC, created_at ASC
    LIMIT 100
  `;
  return rows as unknown as Entry[];
}
