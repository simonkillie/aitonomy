import { getLeaderboard, Entry } from '../lib/db';
import CopyPrompt from './CopyPrompt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROFILE_COLOR: Record<string, string> = {
  'Fleet Orchestrator': '#a78bfa',
  'Hands-Off Architect': '#60a5fa',
  'Autonomous Operator': '#34d399',
  'Copilot Collaborator': '#fbbf24',
  'Hand-Coder': '#9ca3af',
};

const PROFILES = [
  { name: 'Fleet Orchestrator', range: '85–100', desc: 'Manages agents as persistent autonomous resources', color: '#a78bfa' },
  { name: 'Hands-Off Architect', range: '70–84', desc: 'Strategic planner steering agent swarms', color: '#60a5fa' },
  { name: 'Autonomous Operator', range: '45–69', desc: 'Delegates feature ownership with periodic oversight', color: '#34d399' },
  { name: 'Copilot Collaborator', range: '20–44', desc: 'Iterative human-agent dialogue on implementation', color: '#fbbf24' },
  { name: 'Hand-Coder', range: '0–19', desc: 'Agents assist with routine tasks only', color: '#9ca3af' },
];

function profileColor(profile: string): string {
  return PROFILE_COLOR[profile] ?? '#6b7280';
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
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; color: #e5e5e5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5; }
        a { color: inherit; text-decoration: none; }
        a:hover { color: #fff; }
        .container { max-width: 720px; margin: 0 auto; padding: 64px 24px; }
        .header { margin-bottom: 48px; }
        .wordmark { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #4b5563; margin-bottom: 20px; }
        .title { font-size: 26px; font-weight: 700; color: #f5f5f5; margin-bottom: 8px; letter-spacing: -0.02em; }
        .subtitle { color: #6b7280; font-size: 13px; max-width: 520px; line-height: 1.6; }
        .subtitle strong { color: #9ca3af; font-weight: 500; }
        .section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #4b5563; margin-bottom: 16px; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { border-bottom: 1px solid #1f1f1f; }
        .table th { text-align: left; padding: 0 12px 12px; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #4b5563; }
        .table th:first-child { width: 36px; }
        .table th:nth-child(3) { width: 110px; }
        .table th:nth-child(5) { width: 90px; }
        .table tbody tr { border-bottom: 1px solid #111; }
        .table tbody tr:hover { background: #111; }
        .table td { padding: 13px 12px; vertical-align: middle; }
        .rank { color: #374151; font-size: 12px; font-variant-numeric: tabular-nums; }
        .handle { font-weight: 500; color: #d1d5db; }
        .score-cell { display: flex; align-items: center; gap: 10px; }
        .score-bar-track { width: 56px; height: 3px; background: #1f1f1f; border-radius: 2px; flex-shrink: 0; }
        .score-bar-fill { height: 3px; border-radius: 2px; }
        .score-num { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; color: #e5e5e5; }
        .profile-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500; color: #9ca3af; }
        .profile-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .client-badge { display: inline-block; font-size: 10px; font-weight: 500; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 3px; background: #1a1a1a; color: #6b7280; border: 1px solid #222; white-space: nowrap; }
        .client-badge.claude { color: #f59e0b; border-color: #292310; background: #141008; }
        .client-badge.codex { color: #60a5fa; border-color: #0d1929; background: #070d1a; }
        .empty { text-align: center; padding: 48px 12px; color: #374151; font-size: 13px; }
        .agent-box { margin-bottom: 48px; border: 1px solid #1a1a1a; border-radius: 8px; padding: 20px 24px; background: #0a0a0a; }
        .agent-box-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #4b5563; margin-bottom: 10px; }
        .agent-box p { font-size: 13px; color: #6b7280; margin-bottom: 14px; line-height: 1.6; }
        .profiles-grid { margin-top: 48px; }
        .profiles-grid-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #4b5563; margin-bottom: 14px; }
        .profile-row { display: flex; align-items: baseline; gap: 10px; padding: 9px 0; border-bottom: 1px solid #111; }
        .profile-row:last-child { border-bottom: none; }
        .profile-name { font-size: 12px; font-weight: 600; min-width: 160px; }
        .profile-range { font-size: 11px; color: #374151; min-width: 44px; font-variant-numeric: tabular-nums; }
        .profile-desc { font-size: 12px; color: #6b7280; }
        .footer { margin-top: 48px; border-top: 1px solid #111; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; gap: 24px; }
        .footer-note { font-size: 11px; color: #374151; }
        .footer-links { display: flex; gap: 16px; font-size: 12px; color: #4b5563; white-space: nowrap; flex-shrink: 0; }
        .footer-links a:hover { color: #9ca3af; }
        .error { padding: 16px; border: 1px solid #1f1f1f; border-radius: 6px; color: #f87171; font-size: 12px; }
      `}</style>
      <div className="container">
        <header className="header">
          <div className="wordmark">agentry</div>
          <h1 className="title">Who lets their agent run?</h1>
          <p className="subtitle">
            Autonomy scores derived from Claude Code and Codex session data — not self-reported.
            Paste the prompt below into your agent to get scored. Submitting to the leaderboard is <strong>optional</strong>.
          </p>
        </header>

        <div className="agent-box">
          <div className="agent-box-title">Get your score</div>
          <p>Paste this into your agent. It scans your local session logs, scores you, and posts the result. Nothing leaves your machine until it asks.</p>
          <CopyPrompt />
        </div>

        {error ? (
          <div className="error">{error}</div>
        ) : (
          <section>
            <div className="section-label">Rankings</div>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Handle</th>
                  <th>Score</th>
                  <th>Profile</th>
                  <th>Client</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: Entry, idx: number) => {
                  const score = Number(entry.score);
                  const color = profileColor(entry.profile);
                  const clientLower = (entry.client_type ?? '').toLowerCase();
                  const clientClass = clientLower.includes('claude') ? 'claude' : clientLower.includes('codex') ? 'codex' : '';
                  return (
                    <tr key={entry.id}>
                      <td><span className="rank">{idx + 1}</span></td>
                      <td><span className="handle">{entry.handle}</span></td>
                      <td>
                        <div className="score-cell">
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
                          </div>
                          <span className="score-num">{score.toFixed(0)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="profile-pill">
                          <span className="profile-dot" style={{ background: color }} />
                          {entry.profile}
                        </div>
                      </td>
                      <td>
                        {entry.client_type && (
                          <span className={`client-badge ${clientClass}`}>{entry.client_type}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">No entries yet — paste the prompt above into your agent.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        <div className="profiles-grid">
          <div className="profiles-grid-title">Profiles</div>
          {PROFILES.map(p => (
            <div key={p.name} className="profile-row">
              <span className="profile-name" style={{ color: p.color }}>{p.name}</span>
              <span className="profile-range">{p.range}</span>
              <span className="profile-desc">{p.desc}</span>
            </div>
          ))}
        </div>

        <footer className="footer">
          <p className="footer-note">Privacy: no prompt text, code, or file paths ever leave your machine.</p>
          <div className="footer-links">
            <a href="https://github.com/simonkillie/agentry" target="_blank" rel="noopener">GitHub</a>
            <a href="/api/leaderboard">API</a>
          </div>
        </footer>
      </div>
    </>
  );
}
