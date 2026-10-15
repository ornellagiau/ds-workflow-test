# Token docs draft: how to add it to ds-workflow-test

New files (same paths as in this zip):
- tokens/turm-colors.draft.json     data export (168 semantic, 73 primitives, light + dark, reviewed Surface descriptions)
- scripts/build-token-docs.mjs      generates src/docs/ColorTokensDraft.mdx
- src/docs/TokenNaming.mdx          hand-written page "Foundations/Token naming"
- src/docs/TokenMap.jsx             interactive hover map
- src/docs/Swatch.jsx               small color chip used by the generated page

Changed file (replace the existing one):
- .storybook-docs/docs.css          your current rules, unchanged, plus one new section at the end.
                                    The new section is scoped to pages wrapped in <div className="tokendoc">,
                                    so Introduction and Button keep their current look.

Two small edits to existing files:
1. package.json, script "tokens":
     "tokens": "node scripts/build-tokens.mjs && node scripts/build-token-docs.mjs"
2. .gitignore, add a line:
     src/docs/ColorTokensDraft.mdx

Then: npm run storybook:docs   (or npm run build-all)
The existing dummy-token pipeline is not touched.
