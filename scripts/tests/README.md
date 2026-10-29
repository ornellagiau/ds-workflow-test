# scripts/tests/

Tests for the scripts. They use Node's built-in test runner, need no secret and no network, and run in about 10 seconds:

```
npm test
```

The workflow runs them as the job `tests`.

| File | Covers |
|---|---|
| `check-sync.test.mjs` | The sync check. Each test breaks the code or the Figma test data on purpose (a wrong color, a removed rule, a renamed property, a missing dark frame, a deleted node) and checks what the page says. The baseline test says: Link in sync, Button shows exactly one difference (the padding demo) |
| `check-turm.test.mjs` | The Turm check: first run, no change, new saves, a save the version history does not list yet, a refused version history, a failing check (one notification, not one per day), the docs address, and that no names or labels reach the log |
| `turm-log.test.mjs` | `turm-log.sh` against a simulated remote: default mode, branch mode, restore, a failing push |
| `helpers.mjs` | Shared helpers: run a script in a temporary copy of the repo, change files, read the page |

## Adding a test
1. Copy a test from the file of the script you change.
2. Use `runSync({ mutate, fixtureMutate })` (`mutate` changes files in the temp copy, `fixtureMutate` changes the Figma test data) or `makeTurm()`.
3. The temp copy is deleted afterwards. The real repo is never touched.

## When the baseline test fails after a change in Figma
The Figma test data in `scripts/fixtures/figma-sync.json` is a snapshot. If a component was changed on purpose, read the values again and replace the snapshot (see `scripts/README.md`, "Test data").
