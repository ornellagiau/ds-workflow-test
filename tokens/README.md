# tokens/

## turm-colors.json
The real Turm color tokens as data: 73 primitives and 176 semantic tokens (state: see `$description` in the file). It is the source of the Color tokens page and of the explorers.

**Never edit by hand.** It is written by an export that runs in a Claude chat with the Figma connector, from the Turm Foundations file (collections Color Primitives and Color Semantics, modes light and dark).

## Format
```
{ "primitives": { "szGray/900": "#29293A", ... },
  "semantic": [ ["Color/Background/Primary", "p:szWhite", "p:szGray/950", "description"], ... ] }
```
A semantic row is `[name, light, dark, description?]`. A value is a literal `#RRGGBB[AA]`, an alias to a primitive `p:<primitive>`, an alias to another semantic token `s:<token>`, and `@<n>` as a suffix means an opacity of n percent.

## Updating
1. The daily check says that Turm changed (the Turm updates page).
2. Ask Claude "check Turm". It compares the token data in Figma with this file by a fingerprint of the names, values and descriptions, and shows what differs.
3. If something differs, Claude exports a new `turm-colors.json`. Commit it. `npm run tokens` regenerates the Color tokens page.

## Naming
The structure of the names is described on the docs page Foundations / Token naming (source: `src/docs/TokenNaming.mdx`). The CSS naming rule is not defined yet, so no CSS variable names are generated.

## Not covered yet
Size, Responsive and Typography collections, and the Figma scopes of each variable.
