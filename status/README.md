# status/

## turm-log.json
The history of changes to the Turm Foundations file in Figma, as seen by the daily check. **Written by the workflow only** (a bot commit "Turm log: update", through `scripts/turm-log.sh`). Never edit it by hand. It only grows.

Contents: `fileKey`, `startedAt` (when tracking began), `lastStatus` (`ok` or the error), `versionsOk` (whether the version history was readable), `lastModified`, `lastCheck`, and `events`. An event is `{ id, at, source }`: `source` is `versions` for a save that Figma lists in the version history, and `polling` (id starts with `lm:`) for a "last modified" time the history does not list yet. When the history catches up, the polling event is replaced by the real one, so a save is counted once.

**Privacy rule:** the log stores only times and ids. Never names of people, version labels or comments from Figma. The test `scripts/tests/check-turm.test.mjs` checks this.

The page Status/Turm updates (`src/docs/TurmStatus.mdx`) is generated from it on every run.

## Where the log lives
- Default: on the default branch, committed by the bot.
- If the default branch is protected: set the repository variable `TURM_LOG_BRANCH` (for example `turm-data`). The workflow then restores the log from that branch before the check and saves it there afterwards. `main` stays untouched.

## turm-notify.md
The text of a notification, written by `check-turm.mjs` on a run that has news (tracking started, Turm changed, the check failed, the check works again). It is not committed (`.gitignore`). It is only sent if the email step in the workflow is switched on (it is off for now, see the README, section "Operations").
