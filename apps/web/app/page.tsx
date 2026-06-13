import { getLeaderboard, Entry } from '../lib/db';

const PROFILE_EMOJI: Record<string, string> = {
  'Fleet Orchestrator': '🚀',
  'Hands-Off Architect': '🏛️',
  'Autonomous Operator': '⚙️',
  'Copilot Collaborator': '🤝',
  'Hand-Coder': '⌨️',
};

function getEmoji(profile: string): string {
  return PROFILE_EMOJI[profile] ?? '📊';
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: `${Math.max(4, score)}%`,
          maxWidth: '120px',
          height: '8px',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          borderRadius: '4px',
        }}
      />
      <span style={{ fontWeight: 700, fontSize: '1.1em' }}>{Number(score).toFixed(1)}</span>
    </div>
  );
}

export default async function Home() {
  let entries: Entry[] = [];
  let error: string | null = null;

  try {
    entries = await getLeaderboard();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load leaderboard';
  }

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          agentry <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '1rem' }}>autonomy leaderboard</span>
        </h1>
        <p style={{ color: '#9ca3af', maxWidth: '600px' }}>
          Scores derived from real agent session data — parallelism, delegation depth, hands-off ratio, and run length.
          Submitting is <strong style={{ color: '#ededed' }}>optional</strong>.{' '}
          <a href="https://github.com/simonkillie/aitonomy">View source →</a>
        </p>
      </header>

      {error ? (
        <div style={{ padding: '20px', background: '#1f1f1f', borderRadius: '8px', color: '#f87171' }}>
          Error loading leaderboard: {error}
        </div>
      ) : (
        <section>
          <h2 style={{ fontSize: '1.1rem', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Leaderboard
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #374151', color: '#6b7280', fontSize: '0.85rem' }}>
                <th style={{ padding: '8px 12px', width: '48px' }}>#</th>
                <th style={{ padding: '8px 12px' }}>Handle</th>
                <th style={{ padding: '8px 12px', width: '220px' }}>Score</th>
                <th style={{ padding: '8px 12px' }}>Profile</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: Entry, idx: number) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: '1px solid #1f2937',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{entry.handle}</td>
                  <td style={{ padding: '12px' }}>
                    <ScoreBar score={Number(entry.score)} />
                  </td>
                  <td style={{ padding: '12px', color: '#d1d5db' }}>
                    {getEmoji(entry.profile)} {entry.profile}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 12px', textAlign: 'center', color: '#6b7280' }}>
                    No entries yet. Run <code>agentry scan --submit</code> to be the first!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <footer style={{ marginTop: '60px', color: '#4b5563', fontSize: '0.85rem', borderTop: '1px solid #1f2937', paddingTop: '24px' }}>
        <p>
          Privacy: agentry never reads or transmits prompt text, code, or file paths. Only numeric aggregates are submitted.
          Submitting is optional — <code>agentry scan</code> is dry-run by default.
        </p>
        <p style={{ marginTop: '8px' }}>
          <a href="https://github.com/simonkillie/aitonomy">GitHub</a> ·{' '}
          <a href="/api/leaderboard">API</a>
        </p>
      </footer>
    </main>
  );
}
