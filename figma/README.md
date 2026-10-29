# figma/

How the Figma components are tied to the code and the docs.

## Files in Figma
| File | Key | What lives there |
|---|---|---|
| Turm Foundations | `MepRgN24p5VtYVZf1IZer7` | The real token collections (Color Primitives, Color Semantics, Size, Responsive, Typography). Source of `tokens/turm-colors.json`. The daily check watches it. Treated as read-only |
| DS Workflow test (sandbox) | `Qg7XFgQigOnQuD40ATSl9O` | The test components Link and Button, the Link generated from the contract, comparison pages, a dark frame |

Both are in the SZ Figma organization. The owner of `FIGMA_ACCESS_TOKEN` needs access to both.

## component-map.json
One entry per component. Used by `scripts/figma-descriptions.mjs` (descriptions) and `scripts/check-sync.mjs` (comparison).

| Key | Meaning |
|---|---|
| `$fileKey` | The sandbox file |
| `<Component>.code` | The main code file. `.css`, `.mdx` and `.figma.ts` live next to it |
| `figmaSetId` | Node id of the component set in the sandbox file |
| `properties` | Figma property name → code prop name |
| `variants` | Extra targets for descriptions: `figmaName` and `nodeId` per variant |
| `sync` | What the sync check compares: `elements` (code element → CSS classes), `layers` (Figma layer → code element), `axes` (Figma variant property → CSS class), `checks` (which Figma value is compared with which CSS property), `darkFrameId`, and more. The Link entry is the complete example |

When a component is rebuilt in Figma, its node ids change: update `figmaSetId`, the variants and `darkFrameId`, then run `npm run check-sync` and read the page.

## Descriptions (one way: docs → Figma)
1. Each component `.mdx` has `{/* figma-description:<key>: ... */}` blocks (`set` for the component set, one per variant).
2. `npm run figma:descriptions` collects them into `figma/descriptions.json`.
3. `figma/sync-descriptions.js` writes them into Figma (component descriptions and the doc card `doc:<nodeId>` next to each component). It runs **inside Figma**, through Claude with the Figma connector (`use_figma`): paste `descriptions.json` into the script. Do not edit these texts in Figma, they would be overwritten.

## Dark frame
The sync check cannot switch a component to dark mode through the Figma web API. For that, the sandbox has a frame (`darkFrameId`, "Link dark (sync check)") with one instance per variant, set to the explicit dark mode of the Turm variables. The check reads the resolved colors from it. If the frame is deleted or the mode is lost, the check says "dark mode not compared" and compares light only.

## Code Connect
`src/components/*/*.figma.ts` are Code Connect templates. The job `code-connect` publishes them to the sandbox file (needs the token scope `file_code_connect:write` and a Figma plan with Dev Mode). Validate locally: `npx figma connect parse` (reads the templates without publishing).
