# agentry

Measure how autonomously a developer works — scored from real agent session data, not self-reporting.

## What it measures

agentry reads your local Claude Code and Codex session logs and derives a numeric **Composite Autonomy Score** (0–100) from four axes:

| Axis | Weight | What it captures |
|------|--------|-----------------|
| Parallelism | 40% | Peak and sustained concurrent agent sessions |
| Delegation depth | 25% | Tool calls per human turn × subagent fan-out |
| Hands-off ratio | 25% | Inverse of human keystrokes per agent tool call |
| Run length | 10% | Mean uninterrupted agent streak |

## Privacy model

agentry **never reads, stores, or transmits prompt text, code, file paths, or repo names**. It only reads event types, timestamps, tool-call counts, and message-length counts. The submit payload contains only numeric aggregates, your chosen handle, and a one-way device hash for deduplication. Submitting to the leaderboard is **optional** — `--dry-run` is the default.

## Profiles

Scores map to one of five profiles:

| Profile | Score |
|---------|-------|
| Hand-Coder | 0–19 |
| Copilot Collaborator | 20–44 |
| Autonomous Operator | 45–69 |
| Hands-Off Architect | 70–84 |
| Fleet Orchestrator | 85–100 |

## How to run

```bash
# Install
npm install -g @agentry/cli

# Scan and print report (dry-run by default — no data sent)
agentry scan

# Optionally submit your score to the public leaderboard
agentry scan --submit --handle yourname
```

## Submitting is optional

Running `agentry scan` without `--submit` **never contacts the network**. It only prints the JSON payload that would be sent so you can inspect it first. Use `--submit` only if you choose to share your score.

## Development

This is an npm workspaces monorepo:

```
packages/cli   — the CLI tool
apps/web       — the Next.js leaderboard app
docs/          — research and profile documentation
```

```bash
npm install
npm run build          # build all packages
npm test               # run all tests
npm run typecheck      # typecheck all packages
npm run lint           # lint all packages
```

## Deploy

The web app is deployed on Vercel. Set `DATABASE_URL` (Neon PostgreSQL) in the Vercel project environment variables.

## License

MIT
