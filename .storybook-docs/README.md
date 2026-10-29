# .storybook-docs/

Look and settings of the polished docs site (the site root `/`). The developer Storybook (`/dev/`, folder `.storybook/`) is separate and keeps the default look.

**This folder holds styling and settings only.** All readable content is in `src/**/*.mdx`. Both Storybooks read the same files.

| File | What |
|---|---|
| `main.js` | Which files are read, the MDX plugin (tables), the font folder (`docs-assets`), and the built-in story tools that are switched off (readers need only the docs) |
| `preview.js` | Sidebar order (`storySort`), the docs theme, and imports `docs.css` |
| `docs.css` | The whole look of the page content: type, tables, cards, badges, the explorers, the status pages. Colors are CSS variables (`--ds-*`) with light and dark values, taken from the Turm tokens |
| `theme.js` | Light and dark themes for Storybook's own parts, built from Turm token values |
| `mode.js` | Light / dark choice: remembered in the browser, set before the first paint (`data-theme` on the page) |
| `manager.js`, `manager-head.html` | The sun/moon switch in the toolbar and the look of the sidebar (page icons hidden, section labels) |
| `preview-head.html` | Loads the font and sets the dark mode early |

## Changing the sidebar order
Edit `storySort.order` in `preview.js`. Names are the page titles (`<Meta title="Foundations/Color tokens">`). The current order: Introduction, Status, Foundations, Components, Notes.

## Adding a page
Add an `.mdx` file in `src/` with `<Meta title="Group/Name" />`. It appears in the sidebar by its title. No change in this folder is needed unless you add a new group.

## Pages that work without this folder
The generated pages use plain HTML (divs and spans with `ds-*` class names), so they stay readable in the developer Storybook, which does not load `docs.css`.

## Checks before changing the look
Build both: `npm run build-docs` and `npm run build-dev`. Look at the pages in light and dark, and at phone width.
