// tokens/tokens.json (W3C DTCG, exported from Figma) -> src/tokens.css + src/docs/Tokens.mdx
// Values are written literally into the MDX, because Storybook's AI manifest only sees what is in the file.
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("tokens/tokens.json", "utf8"));
const flat = {}; // "Semantic.button-primary.text" -> token

(function walk(node, path) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$") || typeof v !== "object") continue;
    if ("$value" in v) flat[[...path, k].join(".")] = { ...v, path: [...path, k] };
    else walk(v, [...path, k]);
  }
})(data, []);

function resolve(value, depth = 0) {
  if (depth > 6) throw new Error(`Alias depth > 6 (cycle?) at ${value}`);
  const m = /^\{(.+)\}$/.exec(value);
  if (!m) return value;
  if (!flat[m[1]]) throw new Error(`Unknown alias ${value}`);
  return resolve(flat[m[1]].$value, depth + 1);
}

// Semantic tokens: collection name dropped. Primitives: prefixed, so misuse in components is visible.
const cssVar = (t) => {
  const [collection, ...rest] = t.path;
  const name = rest.join("-").toLowerCase().replace(/\s+/g, "-");
  return collection === "Primitives" ? `--primitive-${name}` : `--${name}`;
};

let css = "/* GENERATED from tokens/tokens.json. Do not edit. */\n:root {\n";
for (const t of Object.values(flat)) css += `  ${cssVar(t)}: ${resolve(t.$value)};\n`;
writeFileSync("src/tokens.css", css + "}\n");

const swatch = (v) => `<span style={{display:"inline-block",width:12,height:12,background:"${v}",border:"1px solid #999",verticalAlign:"middle"}} />`;
let mdx = `{/* GENERATED from tokens/tokens.json. Do not edit. */}
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Foundations/Color tokens" summary="All color tokens with resolved values, Figma name and allowed Figma scopes. Components use semantic tokens only." />

# Color tokens

Source: Figma variables, exported to \`tokens/tokens.json\`. Components use **semantic** tokens only; primitives exist to be referenced by semantic tokens.

## Semantic

| Figma name | CSS variable | Value | Alias | Figma scopes |
|---|---|---|---|---|
`;
const row = (t) => {
  const v = resolve(t.$value);
  const scopes = t.$extensions?.["com.figma"]?.scopes?.join(", ") ?? "";
  return `| \`${t.path.slice(1).join("/")}\` | \`${cssVar(t)}\` | ${swatch(v)} ${v} | ${t.$value.startsWith("{") ? `\`${t.$value}\`` : "—"} | ${scopes} |\n`;
};
for (const t of Object.values(flat)) if (t.path[0] === "Semantic") mdx += row(t);
mdx += `\n## Primitives\n\nDo not use in components.\n\n| Figma name | CSS variable | Value | Alias | Figma scopes |\n|---|---|---|---|---|\n`;
for (const t of Object.values(flat)) if (t.path[0] === "Primitives") mdx += row(t);
writeFileSync("src/docs/Tokens.mdx", mdx);
console.log(`tokens: ${Object.keys(flat).length} -> src/tokens.css + src/docs/Tokens.mdx`);
