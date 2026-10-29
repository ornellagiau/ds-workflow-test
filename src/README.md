# src/

Everything the Storybooks read: documentation pages, components and the explorers.

## docs/
| File | What | Written by |
|---|---|---|
| `Introduction.mdx` | Start page with the cards | by hand |
| `TokenNaming.mdx`, `TokenMap.jsx` | Naming rules and the names explorer | by hand |
| `ColorTokens.mdx` | Color tokens, with the values explorer (`TokenChain.jsx`) | **generated** by `scripts/build-token-docs.mjs` |
| `TokenReview.mdx` | A dated note: the token review of Oct 2026, with open decisions | by hand |
| `SyncStatus.mdx` | Status/Sync status: Figma vs code | **generated** by `scripts/check-sync.mjs`, not committed |
| `TurmStatus.mdx` | Status/Turm updates | **generated** by `scripts/check-turm.mjs`, not committed |
| `Swatch.jsx`, `TokenChain.jsx`, `TokenMap.jsx` | Small components used by the pages | by hand |

Generated files start with a comment `GENERATED ... Do not edit`. Change the generator or the data instead.

## components/<Name>/
| File | What |
|---|---|
| `<Name>.jsx`, `<Name>.css` | The component. Colors come from CSS variables, never hardcoded (exception: Button, on purpose, the demo for the sync status) |
| `<Name>.tokens.css` | The CSS variables of the component. Provisional for Link until the CSS naming rule exists |
| `<Name>.mdx` | The docs page. Includes the `figma-description:` blocks (see `figma/README.md`) |
| `<Name>.stories.jsx` | Stories and the prop table (types, defaults, descriptions) |
| `<Name>.figma.ts` | Code Connect template (shows this code in Figma Dev Mode) |
| `<Name>.contract.yaml` | Optional: the written contract of the component (Link). A draft. Used to build the Figma component and the code, and compared with them |

## Adding a component
1. Build or find the component in Figma (the sandbox file) and write its entry in `figma/component-map.json`.
2. Create the folder with the files above. Start from `Link` (the complete example).
3. Add tests if the sync check needs new rules (`scripts/tests/`).
4. Run `npm run prepare-content`, `npm run build-docs` and `npm test`. Read the Sync status page.
