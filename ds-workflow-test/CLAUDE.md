# Instructions for Claude / coding agents

This repo is the single source of truth for the DS workflow test design system.

- **Before building UI**, read `src/docs/Introduction.mdx` (index), then only the `.mdx` of the components you need.
- **Token values:** use `src/docs/Tokens.mdx` or `tokens/tokens.json`. In code, use the CSS variables from `src/tokens.css`. Never hardcode hex values. Never use `--primitive-*` variables in components.
- **Never edit** `src/tokens.css`, `src/docs/Tokens.mdx` or `figma/descriptions.json` by hand. They are generated.
- **Docs change = MDX change.** Figma descriptions come from the `figma-description:<variant>:` lines in each component `.mdx`, mapped via `figma/component-map.json`.
- **Agents may:** read everything, open pull requests. **Agents may not:** merge, delete tokens, rename tokens without an alias.
