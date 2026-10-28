# Phase E: final check, 28 Oct 2026

| # | Check | Result |
|---|---|---|
| 1 | Both Storybooks build (polished and dev), on the working copy and on a fresh copy of the repo with this packet applied | pass |
| 2 | Pages present: Color tokens, Token naming, Link, Button, Token review, Introduction, Sync status, Turm updates. No "(draft)" page, no dummy token page | pass |
| 3 | Applying the packet to a fresh clone of the repo gives exactly the tested files (22 uploaded, 8 deleted) | pass |
| 4 | Token data in the repo against Turm: 176 semantic tokens (names, light, dark, aliases, descriptions) and 73 primitives, checksums equal | pass |
| 5 | Link token CSS against the token data: 14 values (7 tokens, light and dark), 0 differences | pass |
| 6 | Link original against the Link generated from the contract: 30 of 30 variants same (size, text, underline, ring, spacing) | pass |
| 7 | Button in Figma: no variable bindings left; Button.css: no var() | pass |
| 8 | Dark frame: 30 instances, 60 paints compared with the main components, 0 different variable bindings, 0 missing layers; only the mode "Color Semantics = dark" differs; resolved dark colors equal the Turm dark values | pass |
| 9 | Sync check on values read from the real Figma file: Link in sync (30 variants, light and dark), Button 1 difference (padding 11/31 vs 10/30, the demo) | pass |
| 10 | Sync check, 18 deliberate-breakage tests (CSS drift, token drift, removed rule, @media, nested rule, light colors returned for dark, missing dark frame, renamed property, removed prop, changed color, new state, code-only modifier, missing variable, no token, wrong disabled color, instances without layers, renamed layer) | 18/18 pass |
| 11 | Code Connect templates (Button, Link) accepted by `figma connect parse` | pass (rendering in Dev Mode not tested) |
| 12 | Description sync: Link set description and doc card, Button descriptions written in Figma | pass (card not looked at visually) |
| 13 | Workflow file parses; check-turm in the repo is the final version | pass |
| 14 | Leftovers of the dummy setup (tokens.css, Tokens.mdx, tokens.json, draft names, mock data) | none |
| 15 | Word "controls" in docs | none (only Storybook's own `control:` setting and the CLAUDE.md rule) |

## Not testable without Figma's web API (first real run is the test)
- The exact answer format of the web API for per-side stroke weights and for the layers of the dark-frame instances. The check has guards: it says "dark mode not compared" instead of showing wrong numbers.
- Whether the job "code-connect" accepts the Link template with your token and seat.
- Whether Dev Mode shows the Link snippet as intended.
