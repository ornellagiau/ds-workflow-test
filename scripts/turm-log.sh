#!/usr/bin/env bash
# Keeps status/turm-log.json between the daily runs. Used by .github/workflows/storybook-pages.yml.
#
#   turm-log.sh restore   before the check: bring the log from its branch into the working tree
#                         (only when TURM_LOG_BRANCH is set; otherwise the log is already in the checkout)
#   turm-log.sh save      after the check: commit the log
#                         - default: to the branch that is checked out (the default branch)
#                         - with TURM_LOG_BRANCH=<name>: to that branch only, so the default branch stays untouched
#                           (use this when the default branch is protected and the Actions bot may not push to it)
#
# Needs git and the right to push (workflow permission contents: write). A failed push never fails the run:
# the next run adds the missing entry. TURM_LOG_REMOTE (default: origin) is only changed by the tests.
set -euo pipefail

LOG="status/turm-log.json"
BRANCH="${TURM_LOG_BRANCH:-}"
REMOTE="${TURM_LOG_REMOTE:-origin}"

case "${1:-}" in
  restore)
    if [ -z "$BRANCH" ]; then echo "The log lives on the default branch: nothing to restore."; exit 0; fi
    if git fetch --quiet "$REMOTE" "$BRANCH" 2>/dev/null && git cat-file -e "$REMOTE/$BRANCH:$LOG" 2>/dev/null; then
      mkdir -p status
      git show "$REMOTE/$BRANCH:$LOG" > "$LOG"
      echo "Log restored from $REMOTE/$BRANCH."
    else
      echo "No log on the branch $BRANCH yet (first run)."
    fi
    ;;
  save)
    if [ ! -f "$LOG" ]; then echo "No log file, nothing to save."; exit 0; fi
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    if [ -z "$BRANCH" ]; then
      git add "$LOG"
      if git diff --cached --quiet; then echo "No log change."; exit 0; fi
      git commit --quiet -m "Turm log: update"
      git pull --quiet --rebase --autostash "$REMOTE" "$(git rev-parse --abbrev-ref HEAD)" || true
      git push "$REMOTE" HEAD || echo "Push skipped (the repo changed meanwhile). The next run adds it."
    else
      WT="$(mktemp -d)"
      if git fetch --quiet "$REMOTE" "$BRANCH" 2>/dev/null; then
        git worktree add --quiet -B "$BRANCH" "$WT" "$REMOTE/$BRANCH"
      else
        git worktree add --quiet --detach "$WT"
        (cd "$WT" && git checkout --quiet --orphan "$BRANCH" && git rm -rfq .)
      fi
      mkdir -p "$WT/status"
      cp "$LOG" "$WT/status/turm-log.json"
      (
        cd "$WT"
        git add status/turm-log.json
        if git diff --cached --quiet; then
          echo "No log change."
        else
          git commit --quiet -m "Turm log: update"
          git push "$REMOTE" "HEAD:refs/heads/$BRANCH" || echo "Push skipped. The next run adds it."
        fi
      )
      git worktree remove --force "$WT"
    fi
    ;;
  *)
    echo "usage: turm-log.sh restore|save" >&2
    exit 2
    ;;
esac
