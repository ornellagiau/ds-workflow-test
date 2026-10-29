# Instructions for Claude / coding agents

**If you are taking this repo over for a new maintainer** (for example during the move into the organization): read `HANDOVER.md` first, then `README.md`. They hold the decisions, the open questions and the steps. Do the steps in `HANDOVER.md` only as far as it says an agent may.

This repo holds the docs, the code and the checks of the Turm design system test. Design source is Figma: the color tokens live in the file **Turm Foundations**, the components live in the sandbox file **DS Workflow test**. Docs are written here and nowhere else.

- **Before building UI**, read `src/docs/Introduction.mdx` (index), then only the `.mdx` of the components you need.
- **Token values and descriptions:** `tokens/turm-colors.json` (rows: name, light, dark, description) and the generated page `src/docs/ColorTokens.mdx`. Naming rules: `src/docs/TokenNaming.mdx`. Use a global `Color/*` token first. Never use primitives in components.
- **CSS variables:** the CSS naming rule is not defined yet, so there is no generated token CSS. Link uses the provisional file `src/components/Link/Link.tokens.css`. Do not invent a naming scheme, ask.
- **Exception, Button:** Button uses plain hex values on purpose. It is not connected to tokens and is the demo for the Sync status page. Do not "fix" it with tokens. For every other component, never hardcode hex values.
- **Never edit by hand:** `src/docs/ColorTokens.mdx`, `src/docs/SyncStatus.mdx`, `src/docs/TurmStatus.mdx`, `figma/descriptions.json` and `status/turm-log.json`. They are generated. The log is written by the daily workflow.
- **Docs change = MDX change.** Figma descriptions come from the `figma-description:<variant>:` lines in each component `.mdx`, mapped via `figma/component-map.json`.
- **Agents may:** read everything, open pull requests. **Agents may not:** merge, delete tokens, rename tokens without an alias. The workflow's own commit of `status/turm-log.json` is allowed.
- **Two Storybooks:** `.storybook/` (dev) and `.storybook-docs/` (polished) read the same MDX. Never put readable content into `.storybook-docs/`; it holds styling only.
- **Code Connect:** `*.figma.ts` next to each component are the source of the Code Connect templates. CI publishes them to Figma on every push. When a Figma component's properties change, update the `.figma.ts` file; never edit templates in Figma.
- **"Check Turm":** when the user says Turm changed (the page Status/Turm updates and `status/turm-log.json` show it; the issue email "Turm changes" is switched off on purpose for now), read `status/turm-log.json`, read all variables of Turm Foundations through the Figma connector (names, values, aliases, scopes, descriptions), compare them with `tokens/turm-colors.json`, and report exactly what changed. Only then prepare an updated data file.
- **Wording:** write "UI element" or "interactive element", never "controls".
- **Tests:** run `npm test` before and after you change anything in `scripts/`. The tests live in `scripts/tests/` and need no secret. A new rule in a script needs a new test. The Figma test data in `scripts/fixtures/` is a snapshot, replace it only when a Figma component was changed on purpose.
- **Never, without the maintainer saying so in this conversation:** delete the old public repo, change or create secrets, switch on the email notification, change organization or repository settings, rename tokens, or put a secret, a token or a person's name from Figma into a file. Every folder has a `README.md`: read the one of the folder you change.
