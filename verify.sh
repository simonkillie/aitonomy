#!/usr/bin/env bash
# Acceptance gate for agentry. THIS FILE IS THE CONTRACT.
# The agent must make the project satisfy these checks. It must NOT weaken them.
# On any failed check it prints `FAIL <reason>` and exits non-zero.
# Only when every check passes does it print the final line:  VERIFY OK <url>

set -uo pipefail
fail() { echo "FAIL $*"; exit 1; }

# 0. environment
command -v node >/dev/null || fail "node missing"
[ -n "${VERCEL_TOKEN:-}" ] || fail "VERCEL_TOKEN not set"
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL not set"
[ -n "${NPM_TOKEN:-}" ] || fail "NPM_TOKEN not set"

# 1. install
npm install --workspaces --include-workspace-root >/tmp/install.log 2>&1 || fail "install failed"

# 2. typecheck clean
npm run -ws --if-present typecheck >/tmp/tsc.log 2>&1 || fail "typecheck errors"

# 3. lint clean
npm run -ws --if-present lint >/tmp/lint.log 2>&1 || fail "lint errors"

# 4. tests pass AND the suite is real (guards against trivial assert-true tests)
npm test --workspaces >/tmp/test.log 2>&1 || fail "tests failed"
testcount=$(grep -rEc "\bit\(|\btest\(" packages apps 2>/dev/null | awk -F: '{s+=$2} END{print s+0}')
[ "${testcount:-0}" -ge 10 ] || fail "only ${testcount:-0} tests found; suite too thin"

# 5. privacy guarantee: a test must assert the submit payload carries no content
grep -rqiE "no .*(content|prompt|message).*(text|body)|payload.*(no content|excludes)" packages apps 2>/dev/null \
  || fail "no test asserting the submit payload excludes session content"

# 6. CLI runs and defaults to dry-run (no network on a bare scan)
CLI=packages/cli/dist/index.js
[ -f "$CLI" ] || fail "CLI build not found at $CLI"
node "$CLI" scan >/tmp/scan.log 2>&1 || fail "cli scan failed"
grep -qi "dry" /tmp/scan.log || fail "cli scan did not show dry-run as default"

# 7. repo committed and pushed to GitHub
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not a git repo"
git remote get-url origin >/dev/null 2>&1 || fail "no origin remote"
[ -z "$(git status --porcelain)" ] || fail "uncommitted changes present"
git ls-remote origin HEAD >/dev/null 2>&1 || fail "cannot reach github remote"

# 8. README explains the project, privacy model, and that submitting is optional
[ -f README.md ] || fail "no README.md"
grep -qi "privacy" README.md || fail "README missing a privacy section"
grep -qi "optional" README.md || fail "README does not state submitting is optional"

# 9. profiles researched and documented
[ -f docs/RESEARCH.md ] || fail "docs/RESEARCH.md (profiles research) missing"
grep -qiE "profile" docs/RESEARCH.md || fail "RESEARCH.md does not define profiles"

# 10. deploy to Vercel production and capture the URL
# Vercel CLI v54 emits progress on stderr and the deployment URL there too.
# Capture everything, extract the deployment URL, then re-alias the canonical domain.
DEPLOY_OUT=$(vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1) || { echo "$DEPLOY_OUT"; fail "vercel deploy exited non-zero"; }
echo "$DEPLOY_OUT" >/tmp/deploy.log
DEPLOY_URL=$(echo "$DEPLOY_OUT" | grep -oE 'Production\s+https://\S+' | grep -oE 'https://\S+' | head -1)
[ -n "$DEPLOY_URL" ] || { cat /tmp/deploy.log; fail "deploy returned no https url"; }
# Re-alias canonical domain to the new deployment
DEPLOY_ID=$(echo "$DEPLOY_OUT" | grep -oE 'dpl_[A-Za-z0-9]+' | head -1)
if [ -n "$DEPLOY_ID" ] && [ -n "${VERCEL_TOKEN:-}" ]; then
  curl -s -X POST "https://api.vercel.com/v2/deployments/$DEPLOY_ID/aliases" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"alias":"agentry-cli.vercel.app"}' >/dev/null 2>&1 || true
  sleep 3
fi
URL="https://agentry-cli.vercel.app"

# 11. live site returns 200 and renders the leaderboard
code=$(curl -s -o /tmp/home.html -w "%{http_code}" "$URL")
[ "$code" = "200" ] || fail "home returned HTTP $code"
grep -qi "leaderboard" /tmp/home.html || fail "live home does not render a leaderboard"

# 12. live submit API persists a valid test entry that then appears
marker="verify-$(date +%s)"
curl -s -X POST "$URL/api/submit" -H 'content-type: application/json' \
  -d "{\"handle\":\"$marker\",\"score\":42,\"profile\":\"Hand-Coder\"}" >/tmp/post.log 2>&1 \
  || fail "live submit POST failed"
sleep 3
if ! { curl -s "$URL/api/leaderboard" | grep -q "$marker"; } \
   && ! { curl -s "$URL" | grep -q "$marker"; }; then
  fail "submitted test entry did not appear on the live leaderboard"
fi

# 13. npm package published
npm view agentry-cli version >/dev/null 2>&1 || fail "npm package agentry-cli not published to registry"

# 14. npx distribution works end-to-end
perl -e 'alarm 90; exec @ARGV' -- npx --yes agentry-cli@latest scan >/tmp/npx.log 2>&1 || fail "npx agentry-cli scan failed"
grep -qi "dry" /tmp/npx.log || fail "npx agentry-cli scan does not default to dry-run"

# 15. README documents npx usage
grep -qiE "npx agentry" README.md || fail "README does not document npx agentry usage"

# ── Phase 3: Quality & Hardening ─────────────────────────────────────────────

# 16. submit API rejects profiles not in the known enum (must return 400)
bad_code=$(curl -s -o /tmp/bad_profile.log -w "%{http_code}" -X POST "$URL/api/submit" \
  -H 'content-type: application/json' \
  -d '{"handle":"enum-test","score":50,"profile":"InvalidProfile"}')
[ "$bad_code" = "400" ] || fail "submit API accepted invalid profile string (got HTTP $bad_code, expected 400)"

# 17. leaderboard API does not expose device_hash to clients
leaderboard_json=$(curl -s "$URL/api/leaderboard")
if echo "$leaderboard_json" | grep -q "device_hash"; then
  fail "leaderboard API exposes device_hash field to clients"
fi

# 18. CLI fetch to submit endpoint has a timeout guard
grep -qE "AbortSignal\.timeout|AbortController" packages/cli/src/submit.ts \
  || fail "submit.ts fetch call has no timeout (AbortSignal.timeout or AbortController required)"

# 19. CLI handles zero sessions gracefully — no fake score rendered
node "$CLI" scan --days 0 >/tmp/zero.log 2>&1 || true
grep -qiE "no sessions|no data|no .* logs|nothing to scan|0 sessions found" /tmp/zero.log \
  || fail "CLI does not show a no-data message when zero sessions are found (--days 0)"

# 20. validation.ts validates profile against the known enum
grep -qE "Hand-Coder|Fleet Orchestrator" apps/web/lib/validation.ts \
  || fail "validation.ts does not validate profile against the known enum values"

echo "VERIFY OK $URL"
