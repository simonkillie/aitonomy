# How to run the build with /goal

This replaces the old bash DONE-sentinel loop. The official `/goal` primitive keeps
Claude working turn after turn, and after each turn a separate fast model checks
whether your condition holds. The catch that drives the design below: that evaluator
only reads the conversation, it cannot run anything itself. So "done" is defined as
`verify.sh` having printed its success sentinel into the transcript.

Requires Claude Code v2.1.139+ (`/goal` and the separate grader).

## 1. Prereqs (must exist before launch)

A headless agent cannot click through OAuth dashboards, so set these first:

    gh auth login            # so it can create and push the repo
    export VERCEL_TOKEN=...  # so `vercel deploy --prod` runs non-interactively
    export DATABASE_URL=...  # provision a Neon Postgres or Upstash Redis on
                             # Vercel's free tier yourself (about two minutes),
                             # then paste the connection string here

If `DATABASE_URL` is missing, everything else still builds, but the live-deploy
checks stay red and the goal will never clear.

## 2. Drop these four files in an empty directory

    SPEC.md        frozen product spec, operating rules, profiles research task
    CHECKLIST.md   the ordered build items the agent ticks off
    verify.sh      the acceptance gate (the contract; do not let it be weakened)
    GOAL.md        this file

    chmod +x verify.sh

## 3. Launch

Start Claude Code in that directory, turn on auto mode so it does not pause for
approvals, then paste the condition below. For a fully headless run instead, use
`claude -p` with `--dangerously-skip-permissions`.

## 4. The goal condition (paste after `/goal`)

/goal Build the agentry MVP described in SPEC.md, working the items in CHECKLIST.md in order and ticking each one as its own check passes. The goal is met only when, in this conversation, you have run `bash verify.sh` from a clean state after your final change and its output ends with a line beginning `VERIFY OK ` followed by an https:// production URL, with no line of that output containing the token `FAIL`. Constraints that must hold: do not edit verify.sh to remove, skip, or weaken any check; do not mark a CHECKLIST item complete unless its stated check actually passed; never commit secrets or the contents of any session transcript. If not met after 40 turns, stop and write what remains to PROGRESS.md. Run `/goal` with no argument any time to see turns elapsed, tokens spent, and the evaluator's last reason.

## Caveats from the docs

The docs are explicit: do not leave an open-ended goal running overnight, keep a turn
or time limit in the condition (done above), and be ready to Ctrl+C. Run it on a fresh
git branch so anything that goes sideways is throwaway. An unattended Opus run burns
tokens fast, so a rate limit is the likeliest reason it stops before the cap.

## If it stops short (hit the turn cap or ran low on context)

Just relaunch and paste the same condition. The agent rebuilds state from PROGRESS.md
and CHECKLIST.md and continues. That manual relaunch is the only "outer loop" you need;
the per-turn loop is `/goal` itself.
