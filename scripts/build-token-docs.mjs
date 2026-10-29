// tokens/turm-colors.json -> src/docs/ColorTokens.mdx
// Real Turm color tokens, grouped by what you want to color (Background, Content, Border), then by component.
// Values are written literally into the MDX, because Storybook's AI manifest only sees what is in the file.
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("tokens/turm-colors.json", "utf8"));
const prim = data.primitives;
const sem = new Map(data.semantic.map(([name, light, dark, description]) => [name, { name, light, dark, description }]));

const ELEMENTS = ["Surface", "Background", "Border", "Content", "Logo"];
const STATES = ["Idle", "Hover", "Active", "Focused", "Selected", "Disabled", "Error", "Warning", "Success"];
const ROLES = ["Primary", "Secondary", "Highlight", "Ghost"];
const VARIANTS = ["Default", "Inversed"];

// Values: "#RRGGBB" literal, "p:szGray/950@96" primitive at 96% opacity, "s:Color/Background/Primary" other semantic token,
// "x:<name>" alias to a variable that is no longer in the collection (stale, the build stops).
function resolve(ref, mode, depth = 0) {
  if (depth > 6) throw new Error(`Alias depth > 6 at ${ref}`);
  if (ref.startsWith("#")) return ref;
  if (ref.startsWith("x:")) throw new Error(`Alias points to a variable outside the collection (stale after a rename): ${ref.slice(2)}. Re-point it in Figma, then export again.`);
  const [target, opacity] = ref.slice(2).split("@");
  let hex;
  if (ref.startsWith("p:")) {
    hex = prim[target];
    if (!hex) throw new Error(`Unknown primitive ${target}`);
  } else {
    const t = sem.get(target);
    if (!t) throw new Error(`Unknown token ${target}`);
    hex = resolve(t[mode], mode, depth + 1);
  }
  if (opacity === undefined) return hex;
  const a = Math.round((Number(opacity) / 100) * 255).toString(16).padStart(2, "0").toUpperCase();
  return hex.slice(0, 7) + a;
}

const sw = (v) => `<Sw c="${v}" />`;
const esc = (s) => s.replace(/\|/g, "\\|").replace(/[{}]/g, (m) => `\\${m}`).replace(/</g, "&lt;");

function parseName(name) {
  const [component, element, ...rest] = name.split("/");
  let role = null, state = null, variant = null;
  if (rest.length === 3) [role, state, variant] = rest;
  else if (rest.length === 2) [role, state] = rest;
  else if (rest.length === 1) (STATES.includes(rest[0]) ? (state = rest[0]) : (role = rest[0]));
  return { component, element, role, state, variant };
}

// Description lines look like "🎯 Intent: ...". Match on the label, not on the emoji.
function fields(description) {
  const f = { intent: "", notFor: "", a11y: "", other: "" };
  for (const line of (description || "").split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const head = line.slice(0, i), val = line.slice(i + 1).trim();
    if (/Intent/.test(head)) f.intent = val;
    else if (/Not for/.test(head)) f.notFor = val;
    else if (/Accessibility/.test(head)) f.a11y = val;
    else if (/Other/.test(head)) f.other = val;
  }
  return f;
}

const cp = (text) => `\`${text}\``;
// Light and dark, one under the other: swatch, hex, and the primitive it ends at (see chain below).
const valLine = (hex, prim) => `<div className="ds-val">${sw(hex)} <span className="ds-hex">${hex}</span> <em>${prim}</em></div>`;
const valCell = (t) => valLine(resolve(t.light, "light"), chain(t.light, "light").prim) + valLine(resolve(t.dark, "dark"), chain(t.dark, "dark").prim);
// Follow aliases down to the primitive. "via" lists the semantic tokens passed on the way.
function chain(ref, mode, via = []) {
  if (ref.startsWith("#")) return { prim: "literal", via };
  const [target, opacity] = ref.slice(2).split("@");
  if (ref.startsWith("p:")) return { prim: target + (opacity !== undefined ? ` @${opacity}%` : ""), via };
  return chain(sem.get(target)[mode], mode, [...via, target]);
}
const viaCell = (t) => {
  const l = chain(t.light, "light").via[0], d = chain(t.dark, "dark").via[0];
  if (!l && !d) return "—";
  const line = (v) => `<div className="ds-via">${v ?? "—"}</div>`;
  return l === d ? line(l) : line(l) + line(d);
};
const rank = (list, v) => { const i = list.indexOf(v); return i < 0 ? 99 : i; };

const all = [...sem.values()].map((t) => ({ ...t, ...parseName(t.name) }));
const globals = all.filter((t) => t.component === "Color");
const components = all.filter((t) => t.component !== "Color");

let mdx = `{/* GENERATED from tokens/turm-colors.json. Do not edit. */}
import { Meta } from "@storybook/addon-docs/blocks";
import Sw from "./Swatch.jsx";

<Meta title="Foundations/Color tokens" summary="Real Turm color tokens, grouped by what you want to color. Light and dark values, what each token is for, and AA status." />

# Color tokens

> **Source: Figma.** Values and descriptions come from the Figma file [Turm Foundations](https://www.figma.com/design/MepRgN24p5VtYVZf1IZer7). Change them there. This page is generated.
>
> The CSS naming rule is not defined yet, so no CSS variable names are shown.

## How to choose a token
1. Start with the **global tokens** (\`Color/*\`). They work anywhere.
2. Use a **component token** only inside that component.
3. Never use a **primitive** in a component.

Naming rules and the interactive map: **Foundations / Token naming**.

## Global tokens
${globals.length} tokens. Accessibility legend: ✅ meets AA for normal text (4.5:1) · ⚠️ large text only (3:1 to 4.5:1) · ❌ fails · ➖ not applicable. (light) or (dark) means only in that mode.

`;

for (const element of ["Background", "Content", "Border"]) {
  const rows = globals.filter((t) => t.element === element);
  if (!rows.length) continue;
  // Content: Primary and Secondary (Default, Inversed) first, then the status colors. Sort is stable.
  if (element === "Content") rows.sort((a, b) => rank(ROLES, a.role) - rank(ROLES, b.role) || rank(VARIANTS, a.variant) - rank(VARIANTS, b.variant));
  const parsed = rows.map((t) => ({ t, f: fields(t.description) }));
  const hasDesc = parsed.some((p) => p.f.intent || p.f.notFor || p.f.a11y || p.f.other);
  mdx += `### ${element} (${rows.length})\n\n`;
  // Visible: token, values, AA icon, one-line use. Not for / Accessibility / Other open on demand.
  mdx += hasDesc ? `| Token | Light / Dark | AA | Use | More |\n|---|---|---|---|---|\n` : `| Token | Light / Dark |\n|---|---|\n`;
  for (const { t, f } of parsed) {
    mdx += `| ${cp(t.name)} | ${valCell(t)} |`;
    if (hasDesc) {
      const icon = f.a11y ? ([...new Set(f.a11y.match(/✅|⚠️|❌|➖/gu) ?? [])].join(" ") || "—") : "—";
      const more = [
        f.notFor && `<strong>Not for:</strong> ${esc(f.notFor)}`,
        f.a11y && `<strong>Accessibility:</strong> ${esc(f.a11y)}`,
        f.other && `<strong>Other:</strong> ${esc(f.other)}`,
      ].filter(Boolean).join("<br />");
      mdx += ` ${icon} | ${esc(f.intent) || "—"} | ${more ? `<details><summary>Details</summary>${more}</details>` : "—"} |`;
    }
    mdx += "\n";
  }
  if (!hasDesc) mdx += `\nDescriptions follow.\n`;
  mdx += "\n";
}

const byComponent = new Map();
for (const t of components) (byComponent.get(t.component) ?? byComponent.set(t.component, []).get(t.component)).push(t);
mdx += `## Component tokens\n${components.length} tokens in ${byComponent.size} components. Open a component to see its tokens. Each value shows the primitive it ends at. Via is the global token it points to.\n\n`;
for (const name of [...byComponent.keys()].sort()) {
  const rows = byComponent.get(name).sort((a, b) =>
    rank(ELEMENTS, a.element) - rank(ELEMENTS, b.element) ||
    rank(ROLES, a.role) - rank(ROLES, b.role) || String(a.role).localeCompare(String(b.role)) ||
    rank(STATES, a.state) - rank(STATES, b.state));
  mdx += `<details>\n<summary>${name} (${rows.length})</summary>\n\n| Token | Light / Dark | Via |\n|---|---|---|\n`;
  for (const t of rows) mdx += `| ${cp(t.name.split("/").slice(1).join("/"))} | ${valCell(t)} | ${viaCell(t)} |\n`;
  mdx += `\n</details>\n\n`;
}

const families = new Map();
for (const [name, hex] of Object.entries(prim)) {
  const fam = name.split("/")[0];
  (families.get(fam) ?? families.set(fam, []).get(fam)).push([name, hex]);
}
mdx += `## Primitives\nDo not use in components. ${Object.keys(prim).length} values in ${families.size} families.\n\n`;
for (const [fam, items] of families) {
  mdx += `<details>\n<summary>${fam} (${items.length}) ${items.map(([, hex]) => sw(hex)).join(" ")}</summary>\n\n| Primitive | Value |\n|---|---|\n`;
  for (const [name, hex] of items) mdx += `| ${cp(name)} | ${sw(hex)} ${hex} |\n`;
  mdx += `\n</details>\n\n`;
}

writeFileSync("src/docs/ColorTokens.mdx", mdx);
console.log(`token docs: ${sem.size} semantic + ${Object.keys(prim).length} primitives -> src/docs/ColorTokens.mdx`);
