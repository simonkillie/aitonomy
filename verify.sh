#!/usr/bin/env bash
# Acceptance gate for the agentry MVP. THIS FILE IS THE CONTRACT.
# The agent must make the project satisfy these checks. It must NOT weaken them.
# On any failed check it prints `FAIL <reason>` and exits non-zero.
# Only when every check passes does it print the final line:  VERIFY OK <url>
#
# Paths/script names below assume the conventions in SPEC.md. The agent may adapt
# a path if its layout differs, but must not remove or soften a check.

set -uo pipefail
fail() { echo "FAIL $*"; exit 1; }

# 0. environment
command -v node >/dev/null || fail "node missing"
[ -n "${VERCEL_TOKEN:-}" ] || fail "VERCEL_TOKEN not set"
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL not set"

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
URL=$(vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>/tmp/deploy.log | tail -n1)
case "$URL" in https://*) ;; *) cat /tmp/deploy.log; fail "deploy returned no https url" ;; esac

# 11. live site returns 200 and renders the leaderboard
code=$(curl -s -o /tmp/home.html -w "%{http_code}" "$URL")
[ "$code" = "200" ] || fail "home returned HTTP $code"
grep -qi "leaderboard" /tmp/home.html || fail "live home does not render a leaderboard"

# 12. live submit API persists a test entry that then appears
marker="verify-$(date +%s)"
curl -s -X POST "$URL/api/submit" -H 'content-type: application/json' \
  -d "{\"handle\":\"$marker\",\"score\":42,\"profile\":\"test\"}" >/tmp/post.log 2>&1 \
  || fail "live submit POST failed"
sleep 3
if ! { curl -s "$URL/api/leaderboard" | grep -q "$marker"; } \
   && ! { curl -s "$URL" | grep -q "$marker"; }; then
  fail "submitted test entry did not appear on the live leaderboard"
fi

echo "VERIFY OK $URL"
