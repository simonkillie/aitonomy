# CHECKLIST: agentry

Work top to bottom. Tick a box only when its own check passes. Keep this file and
PROGRESS.md updated every turn. The final state is `verify.sh` printing `VERIFY OK`.

## Foundation
- [ ] npm workspaces monorepo: `packages/cli` + `apps/web`, TypeScript, shared tsconfig
- [ ] Root scripts wired: `typecheck`, `lint`, `test` resolve across workspaces
- [ ] Git repo initialized, public GitHub repo created via `gh`, origin set, first push

## Research (do before coding the score)
- [ ] Web research on developer-autonomy characterization, written to `docs/RESEARCH.md`
- [ ] 4 to 6 named profiles defined with explicit metric bands mapping score -> profile

## CLI
- [ ] Session locators for `~/.claude/projects` and `~/.codex/sessions` (honor `CODEX_HOME`)
- [ ] JSONL parser that reads only event types, timestamps, tool_use, subagent markers
- [ ] Concurrency detector: peak/sustained overlapping sessions from interleaved timestamps
- [ ] Metrics: parallelism, delegation depth, hands-off ratio, run length
- [ ] Composite score (40/25/25/10) and profile mapping
- [ ] `scan` command prints report + profile; `--dry-run` is the default
- [ ] `--submit` posts numeric aggregate only; build the exact payload object
- [ ] Test asserting the submit payload contains no session content (privacy guarantee)
- [ ] At least 10 real tests across the suite

## Web
- [ ] Next.js App Router app in `apps/web`, deployable on Vercel free tier
- [ ] DB layer using `DATABASE_URL`; schema for entries (handle, score, profile, device hash)
- [ ] `/api/submit` validates, persists, dedupes by device hash
- [ ] `/api/leaderboard` returns standings
- [ ] Leaderboard page renders ranked entries with profile, seeded sample rows visible

## Docs and ship
- [ ] README.md: what it is, the metric, the privacy model, how to run, submitting is optional
- [ ] `vercel deploy --prod` succeeds, production URL captured
- [ ] Live home returns 200 and renders the leaderboard
- [ ] Live `/api/submit` persists a test entry that then appears on the live leaderboard
- [ ] `bash verify.sh` prints `VERIFY OK <url>` with no FAIL lines
