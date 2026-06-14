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

## Docs and ship (MVP)
- [x] README.md: what it is, the metric, the privacy model, how to run, submitting is optional
- [x] `vercel deploy --prod` succeeds, production URL captured
- [x] Live home returns 200 and renders the leaderboard
- [x] Live `/api/submit` persists a test entry that then appears on the live leaderboard
- [x] `bash verify.sh` prints `VERIFY OK <url>` with no FAIL lines (MVP)

## Distribution (Phase 2)
- [x] GitHub repo renamed from `aitonomy` to `agentry`
- [x] Git remote updated to `github.com/simonkillie/agentry`
- [x] Vercel alias set to `https://agentry-cli.vercel.app`
- [x] CLI default submit endpoint updated to `https://agentry-cli.vercel.app/api/submit`
- [x] `packages/cli` npm package name set to `agentry-cli`, files field set, .npmrc configured
- [x] `npm publish` succeeds: package `agentry-cli` live on npm registry
- [x] README updated: new GitHub URL, new web URL, npx usage prominently documented
- [x] `bash verify.sh` prints `VERIFY OK` with all 15 checks including npm + npx

## Quality & Hardening (Phase 3) — current

### Critical: Correctness & Security
- [x] C1: `submit.ts` — return `{ok:false}` on non-2xx instead of throwing (prevents ugly crash on submit failure)
- [x] C2: `db.ts` — replace SELECT+UPDATE/INSERT race with `INSERT ... ON CONFLICT (device_hash) DO UPDATE`; add UNIQUE constraint
- [x] C3: `db.ts` — remove DDL (`ensureTable`) from request hot path; run migration once at startup/deploy
- [x] C4: `leaderboard/route.ts` — omit `device_hash` from `getLeaderboard()` SELECT and API response

### Security: Input Validation
- [x] M2: `validation.ts` — sanitize `handle` against Unicode control characters and directional overrides
- [x] M3: `validation.ts` — validate `profile` against the known 5-value enum (reject unknown profiles with 400)
- [x] M7: `submit.ts` — add `AbortSignal.timeout(10_000)` to the fetch call (no-timeout = CLI hangs forever)

### CLI UX: Critical paths
- [x] CLI-5.1: Zero sessions shows a no-data message (`No sessions found — try --days 30`), not a fake `0.0/100` score
- [x] CLI-5.3: Fix `"1 sessions"` → `"1 session"` grammar
- [x] CLI-4.1: Error handler gives cause-specific hints (file permissions, parse errors, network failures)

### CLI UX: Score explanation
- [x] CLI-1.1: Axis labels in breakdown include short inline gloss (e.g. `Parallelism (concurrent sessions)`)
- [x] CLI-2.1: Add `(weight = share of composite score)` note under Breakdown heading
- [x] CLI-2.2: Balanced-score insight names the weakest axis and gives its specific tip, not a generic message
- [x] CLI-2.3: Profile line shows score range, e.g. `Autonomous Operator  45–69`
- [x] CLI-7.4: When Codex sessions present, note that subagent detection is unsupported (delegation may be underreported)

### Metrics: Accuracy
- [x] M4: Fix `normalizeRunLength` comment (says 90 min; formula saturates at 150 min)
- [x] M5: `toolsPerTurn` fallback when no human turns should be capped, not equal to raw tool count
- [x] L3: Remove dead export `getProfileDescription` from `profiles.ts`

### Web UX: First impression
- [x] Web-CTA: Agent box visually distinct — higher contrast border/background vs page
- [x] Web-CTA: Add stepped instructions (1. Copy → 2. Paste into agent → 3. See score)
- [x] Web-CTA: Move privacy note and "how it works" into the CTA box, not just footer
- [x] Web-Mobile: Add CSS media query to hide Profile/Client columns and adjust layout at <600px
- [x] Web-Trust: Add "source code on GitHub" link near the copy prompt

### Ship Phase 3
- [x] All fixes committed, pushed, npm published, Vercel redeployed, alias re-pointed
- [x] `bash verify.sh` prints `VERIFY OK` with all 20 checks passing

## UX + submit-500 fix (Phase 4) — current

### Critical: submit 500 bug
- [x] P4-1: Root cause — `entries_device_hash_key` UNIQUE constraint missing, so `ON CONFLICT (device_hash)` 500s for real CLI submits
- [x] P4-2: Create the UNIQUE constraint on the live DB (migration)
- [x] P4-3: Enable `experimental.instrumentationHook` so fresh deploys self-migrate (instrumentation.ts was never running)
- [x] P4-4: verify.sh test-submit now sends a device_hash (exercises ON CONFLICT path) — catches this class of bug
- [x] P4-5: Live curl: submit WITH device_hash returns 200 (was 500)

### Data cleanup
- [x] P4-6: Delete stale verify-* and dev-abc123 test rows from live DB
- [x] P4-7: verify.sh cleans up its own test record so verify-* rows stop accumulating

### Leaderboard UI
- [x] P4-8: Move rankings table ABOVE the "Get your score" box
- [x] P4-9: Add a "Submitted" column, CEST-formatted (Europe/Oslo) from created_at
- [x] P4-10: Table scrolls (sticky header) once entries exceed ~20 rows
- [x] P4-11: New column hidden on mobile alongside Profile/Client

### Agent prompt
- [x] P4-12: Copied prompt instructs the agent to run scan first, show the score, and ASK the user before submitting (no silent auto-upload)

### Ship Phase 4
- [x] P4-13: Built, tests pass, npm published, committed, pushed, deployed, re-aliased
- [x] P4-14: `bash verify.sh` prints `VERIFY OK` and live curls confirm 200-with-device_hash
