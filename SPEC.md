# SPEC: agentry

Frozen requirements for the build. Read this and CHECKLIST.md at the start of every
run. `verify.sh` is the acceptance contract: the project must satisfy it as written.

## What it is

A tool that measures how autonomously a developer works, scored from real agent
session data, not self-reporting. Open source, on GitHub, deployed live on Vercel's
free tier. One monorepo: `packages/cli` plus `apps/web` (npm workspaces, TypeScript).

## Operating rules

- Runs unattended in auto mode. Never ask the user anything. Never pause for approval.
- On any error, diagnose, fix, and continue. Route around blockers, record them.
- Commit small and often, push after every green checklist item.
- Keep PROGRESS.md current so a fresh session resumes with zero context loss.
- Never claim something works without running it and surfacing the output.
- Treat the playbook split as real: SPEC is requirements, CHECKLIST is the plan,
  the goal condition is execution. Do not redesign requirements mid-run.

## The autonomy signal (computed, never self-reported)

Read local agent transcripts, derive numeric metrics only. Never read or transmit
prompt text or code.

Data sources:
- Claude Code: `~/.claude/projects/<encoded-path>/<session-id>.jsonl`, plus
  `sessions-index.json` (timestamps, message counts, git branch) and subagent files.
- Codex: `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl`, each line
  UTC-timestamped with tool calls and token usage. Honor `CODEX_HOME`.
- Codex cloud tasks: `codex cloud list --json` (best effort, skip if unavailable).
- Claude cloud sessions: teleported sessions already appear as normal local JSONL,
  so the local miner captures them. Do not build against the unofficial cloud-list API.

Composite Autonomy Score (normalize each axis 0-100, then weight):
- Parallelism (40%): peak and sustained count of sessions whose active windows
  overlap, from interleaved event timestamps; log-scaled, ~8-10 saturates.
- Delegation depth (25%): tool calls per human turn times subagent fan-out.
- Hands-off ratio (25%): inverse of human characters typed per agent tool call.
- Run length (10%): mean uninterrupted agent streak (no user message between events).

## CLI (`packages/cli`)

- `agentry scan`: globs the log dirs, last N sessions or last 7 days, parses only
  event types, timestamps, tool_use counts, subagent markers. Never message bodies.
  Prints the report and the computed profile.
- `--dry-run` is the DEFAULT. Print the exact JSON that would be sent.
- `--submit` is opt-in only: posts the numeric aggregate (handle, scores, tool-type
  counts, time window, profile). No content, no repo names, no paths. Hash a device
  key for dedupe. A test must assert the payload contains no session content.

## Web (`apps/web`, Next.js App Router)

- Public leaderboard page, ranked by score, profile shown per entry.
- `/api/submit`: validates and persists to the DB, dedupes by device hash.
- `/api/leaderboard`: returns current standings.
- Seed a few sample rows so the page works before any real submission.

## Profiles (research task, do early)

Do real web research on how developer autonomy is characterized in current
agentic-dev practice. Write findings to `docs/RESEARCH.md`. Define 4 to 6 named
profiles grounded in the axes above, from a hands-on hand-coder up to a fleet
orchestrator running many parallel and remote sessions. Specify the metric bands
that map a score to each profile, and implement that mapping in both CLI and web.
