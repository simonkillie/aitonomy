# agentry

Scores how autonomously you work — derived from real Claude Code and Codex session data, not self-reporting.

**[Leaderboard →](https://agentry-cli.vercel.app)** · **[npm →](https://www.npmjs.com/package/agentry-cli)** · **[GitHub →](https://github.com/simonkillie/agentry)**

## Quick start

```bash
npx agentry-cli scan
```

That's it. No install, no config. It reads your local session logs, scores you, and shows:

```
────────────────────────────────────────────────
  agentry · Autonomy Score
────────────────────────────────────────────────

  45.3 / 100
  ███████████████░░░░░░░░░░░░░░░░░  Autonomous Operator

  Delegates feature ownership with periodic oversight.

  31 sessions · Claude Code · last 7 days

────────────────────────────────────────────────
  Breakdown

  Parallelism   ██████████████████████░░░░░░░░░░   69.7  40%
  Delegation    ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    8.6  25%
  Hands-off     ███████████████████░░░░░░░░░░░░░   59.1  25%
  Run Length    ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    5.4  10%

  Biggest gap: Delegation depth (8) — let your agent make more decisions before you check in.

────────────────────────────────────────────────
  Share your score (optional):

  agentry scan --submit
  https://agentry-cli.vercel.app

  Nothing leaves your machine without --submit.
────────────────────────────────────────────────
```

Submitting to the leaderboard is **optional**. The default is always a local-only dry run.

## Score via your agent

Paste this into Claude Code or Codex and your agent will run it for you:

> Run `npx agentry-cli scan --submit` to measure my autonomy score and post it to the agentry leaderboard. Only numeric session metadata is transmitted — no prompts, code, or file paths.

## CLI options

```bash
# Dry-run (default — nothing sent anywhere)
npx agentry-cli scan

# Submit to leaderboard
npx agentry-cli scan --submit

# Custom display name (defaults to your OS username)
npx agentry-cli scan --submit --handle yourname

# Limit scope
npx agentry-cli scan --days 3
npx agentry-cli scan --last-n 20
```

## What it measures

| Axis | Weight | What it captures |
|------|--------|-----------------|
| Parallelism | 40% | Peak and sustained concurrent agent sessions |
| Delegation depth | 25% | Tool calls per human turn — how much you let the agent do |
| Hands-off ratio | 25% | Inverse of your keystrokes per agent tool call |
| Run length | 10% | Mean uninterrupted agent streak |

## Profiles

| Profile | Score | What it means |
|---------|-------|---------------|
| Fleet Orchestrator | 85–100 | Manages agents as persistent autonomous resources |
| Hands-Off Architect | 70–84 | Strategic planner steering agent swarms |
| Autonomous Operator | 45–69 | Delegates feature ownership with periodic oversight |
| Copilot Collaborator | 20–44 | Iterative human-agent dialogue on implementation |
| Hand-Coder | 0–19 | Agents assist with routine tasks only |

## Privacy

agentry **never reads, stores, or transmits prompt text, code, file paths, or repo names**. It only reads event types, timestamps, and tool-call counts. The submit payload is numeric scores + your chosen handle + a one-way device hash for deduplication.

## Data sources

- **Claude Code**: `~/.claude/projects/<encoded-path>/<session-id>.jsonl`
- **Codex**: `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl` (honours `CODEX_HOME`)

## Development

```
packages/cli   — CLI (published as agentry-cli on npm)
apps/web       — Next.js leaderboard (agentry-cli.vercel.app)
docs/          — research and profile documentation
```

```bash
git clone https://github.com/simonkillie/agentry
npm install
npm run build
npm test
```

## License

MIT
