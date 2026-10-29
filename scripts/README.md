# scripts/

The checks and generators. All are plain Node scripts without extra dependencies (the shell script needs git). They are run by `npm run` commands and by the workflow `.github/workflows/storybook-pages.yml`.

| Script | What it does | Reads | Writes | Needs the Figma token |
|---|---|---|---|---|
| `check-turm.mjs` | Checks whether the Turm Foundations file in Figma changed (file's last-modified time and the version history), keeps the log, writes the page and the notification text | Figma web API (read-only), `status/turm-log.json` | `status/turm-log.json`, `src/docs/TurmStatus.mdx`, `status/turm-notify.md` (only when there is news) | yes |
| `turm-log.sh` | Brings the log from its own branch (`restore`) and commits it (`save`), to the default branch or to the branch in `TURM_LOG_BRANCH` | git | `status/turm-log.json` (commit) | no |
| `check-sync.mjs` | Compares each Figma component with its **implementation** (not with the contract): properties, variants, and colors per variant, in light and dark mode. Writes the page Status/Sync status | Figma web API (read-only), `src/components/**`, `figma/component-map.json` | `src/docs/SyncStatus.mdx` | yes |
| `build-token-docs.mjs` | Generates the Color tokens page from the token data | `tokens/turm-colors.json` | `src/docs/ColorTokens.mdx` | no |
| `figma-descriptions.mjs` | Collects the `figma-description:` texts from the component MDX files, mapped to Figma node ids | `src/components/*/*.mdx`, `figma/component-map.json` | `figma/descriptions.json` | no |

## npm commands
| Command | Runs |
|---|---|
| `npm run tokens` | `build-token-docs.mjs` |
| `npm run figma:descriptions` | `figma-descriptions.mjs` |
| `npm run check-sync` | `check-sync.mjs` |
| `npm run prepare-content` | all three above |
| `npm run build-all` | `prepare-content`, then both Storybook builds into `site/` |
| `npm test` | all tests in `scripts/tests/` |

`check-turm.mjs` is run directly (`node scripts/check-turm.mjs`) by the workflow.

## Environment variables
| Variable | Used by | Meaning |
|---|---|---|
| `FIGMA_ACCESS_TOKEN` | `check-turm`, `check-sync` | Figma token. Without it the pages say "Not checked" and nothing fails |
| `FIGMA_FIXTURE` | `check-sync` | Path to a JSON file with Figma test data (instead of calling Figma). Example: `scripts/fixtures/figma-sync.json` |
| `TURM_FIXTURE_DIR` | `check-turm` | Folder with `file.json` and `versions.json` (instead of calling Figma). Used by the tests |
| `TURM_NOW` | `check-turm` | Pretends it is this time (ISO string). Used by the tests |
| `DOCS_URL` | `check-turm` | Address of the docs site, for the link in the notification. If unset, derived from `GITHUB_REPOSITORY` |
| `TURM_LOG_BRANCH` | `turm-log.sh` | Name of a branch that holds the log. If unset, the log lives on the default branch |
| `TURM_LOG_REMOTE` | `turm-log.sh` | Git remote name, default `origin`. Only the tests change it |

## The log and the privacy rule
`check-turm.mjs` stores only times and ids in the log, never names, labels or comments of Figma versions. See `status/README.md`.

## Test data
`fixtures/figma-sync.json` holds values read from the real Figma files on 28 Oct 2026 (the Link and Button component sets and the dark frame). It makes `check-sync` testable without Figma. When a component in Figma changes on purpose, read the values again and replace the fixture, otherwise the baseline test will fail.

## Adding a check
Write the script, give it an npm command, add tests in `scripts/tests/` (see `tests/README.md`), add a row to the table above and describe the page it writes in `src/README.md`.
