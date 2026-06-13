# CHECKLIST: agentry

Work top to bottom. Tick a box only when its own check passes. Keep this file and
PROGRESS.md updated every turn. The final state is `verify.sh` printing `VERIFY OK`.

## Foundation
- [x] npm workspaces monorepo: `packages/cli` + `apps/web`, TypeScript, shared tsconfig
- [x] Root scripts wired: `typecheck`, `lint`, `test` resolve across workspaces
- [x] Git repo initialized, public GitHub repo created via `gh`, origin set, first push

## Research (do before coding the score)
- [x] Web research on developer-autonomy characterization, written to `docs/RESEARCH.md`
- [x] 4 to 6 named profiles defined with explicit metric bands mapping score -> profile

## CLI
- [x] Session locators for `~/.claude/projects` and `~/.codex/sessions` (honor `CODEX_HOME`)
- [x] JSONL parser that reads only event types, timestamps, tool_use, subagent markers
- [x] Concurrency detector: peak/sustained overlapping sessions from interleaved timestamps
- [x] Metrics: parallelism, delegation depth, hands-off ratio, run length
- [x] Composite score (40/25/25/10) and profile mapping
- [x] `scan` command prints report + profile; `--dry-run` is the default
- [x] `--submit` posts numeric aggregate only; build the exact payload object
- [x] Test asserting the submit payload contains no session content (privacy guarantee)
- [x] At least 10 real tests across the suite

## Web
- [x] Next.js App Router app in `apps/web`, deployable on Vercel free tier
- [x] DB layer using `DATABASE_URL`; schema for entries (handle, score, profile, device hash)
- [x] `/api/submit` validates, persists, dedupes by device hash
- [x] `/api/leaderboard` returns standings
- [x] Leaderboard page renders ranked entries with profile, seeded sample rows visible

## Docs and ship
- [x] README.md: what it is, the metric, the privacy model, how to run, submitting is optional
- [x] `vercel deploy --prod` succeeds, production URL captured
- [x] Live home returns 200 and renders the leaderboard
- [x] Live `/api/submit` persists a test entry that then appears on the live leaderboard
- [x] `bash verify.sh` prints `VERIFY OK <url>` with no FAIL lines
