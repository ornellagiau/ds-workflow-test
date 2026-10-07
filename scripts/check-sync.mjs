// Compares Figma components with the code and writes src/docs/SyncStatus.mdx.
// Figma side: REST API (needs FIGMA_ACCESS_TOKEN with file_content:read).
// Code side:  Button.css (styles, variants) + Button.figma.ts (properties used by Code Connect).
// Mapping Figma <-> code lives in CHECKS below. No separate contract file.
import { readFileSync, writeFileSync } from "node:fs";

const FILE_KEY = "Qg7XFgQigOnQuD40ATSl9O";
const OUT = "src/docs/SyncStatus.mdx";
const map = JSON.parse(readFileSync("figma/component-map.json", "utf8"));
const tokens = JSON.parse(readFileSync("tokens/tokens.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);

// ---------- Figma variable ID -> CSS variable (same naming as build-tokens.mjs) ----------
const varIdToCss = {};
(function walk(node, path) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$") || typeof v !== "object") continue;
    if ("$value" in v) {
      const id = v.$extensions?.["com.figma"]?.variableId;
      const [collection, ...rest] = [...path, k];
      const name = rest.join("-").toLowerCase().replace(/\s+/g, "-");
      if (id) varIdToCss[id] = collection === "Primitives" ? `--primitive-${name}` : `--${name}`;
    } else walk(v, [...path, k]);
  }
})(tokens, []);

// ---------- Code side: tiny CSS parser ----------
function parseCss(css) {
  const rules = {};
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const decls = Object.fromEntries(m[2].split(";").map((d) => d.split(":").map((s) => s && s.trim())).filter(([k, v]) => k && v));
    for (const sel of m[1].split(",").map((s) => s.trim())) rules[sel] = { ...(rules[sel] || {}), ...decls };
  }
  return rules;
}
const px = (v) => (v == null ? null : parseFloat(v));
const pad4 = (v) => { const p = (v || "0").split(/\s+/).map(px); return [p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]]; };
const cssVarOf = (v) => (v && /var\((--[^),\s]+)/.exec(v)?.[1]) || null;
const firstFamily = (v) => v && v.split(",")[0].trim().replace(/["']/g, "");

// ---------- Figma side ----------
async function loadFigma(ids) {
  if (process.env.FIGMA_FIXTURE) return JSON.parse(readFileSync(process.env.FIGMA_FIXTURE, "utf8"));
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error("FIGMA_ACCESS_TOKEN is not set, so Figma could not be read.");
  const res = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${ids.join(",")}`, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`Figma API answered ${res.status} ${res.statusText}.`);
  return res.json();
}
const boundId = (paints) => (paints || []).find((p) => p.visible !== false)?.boundVariables?.color?.id || null;
const findText = (node) => node.type === "TEXT" ? node : (node.children || []).map(findText).find(Boolean);

// ---------- Compare one component ----------
function compare(component, entry, setNode) {
  const diffs = [];
  const add = (area, what, figma, code) => diffs.push({ area, what, figma: figma ?? "—", code: code ?? "—" });
  const base = entry.code.replace(/\.jsx$/, "");
  const css = parseCss(readFileSync(`${base}.css`, "utf8"));
  const template = readFileSync(`${base}.figma.ts`, "utf8");
  const baseSel = Object.keys(css).find((s) => /^\.[\w-]+$/.test(s) && !s.includes("--"));
  const baseRule = css[baseSel] || {};

  // Properties: Figma component properties vs. properties the Code Connect template reads
  const figmaProps = Object.keys(setNode.componentPropertyDefinitions || {}).map((k) => k.split("#")[0]).sort();
  const templateProps = [...template.matchAll(/get(?:Enum|String|Boolean|InstanceSwap)\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]).sort();
  for (const p of figmaProps) if (!templateProps.includes(p)) add("Properties", `Figma property "${p}" is not used in code`, p, null);
  for (const p of templateProps) if (!figmaProps.includes(p)) add("Properties", `Code expects Figma property "${p}"`, null, p);

  // Variants: Figma variant options vs. CSS modifier classes
  const variantDef = Object.entries(setNode.componentPropertyDefinitions || {}).find(([, d]) => d.type === "VARIANT");
  const figmaVariants = (variantDef?.[1].variantOptions || []).map((v) => v.toLowerCase()).sort();
  const codeVariants = Object.keys(css).map((s) => new RegExp(`^${baseSel}--([\\w-]+)$`).exec(s)?.[1]).filter(Boolean).sort();
  for (const v of figmaVariants) if (!codeVariants.includes(v)) add("Variants", `Variant "${v}" exists in Figma only`, v, null);
  for (const v of codeVariants) if (!figmaVariants.includes(v)) add("Variants", `Variant "${v}" exists in code only`, null, v);

  // Styles per variant
  for (const child of setNode.children || []) {
    const variant = /Variant=(\w+)/i.exec(child.name)?.[1]?.toLowerCase();
    if (!variant || !codeVariants.includes(variant)) continue;
    const rule = { ...baseRule, ...(css[`${baseSel}--${variant}`] || {}) };
    const label = variant;
    const text = findText(child);
    const check = (area, what, figma, code) => { if (String(figma) !== String(code)) add(area, `${what} (${label})`, figma, code); };

    if (text?.style) {
      check("Typography", "Font family", text.style.fontFamily, firstFamily(rule["font-family"]));
      check("Typography", "Font weight", text.style.fontWeight, rule["font-weight"]);
      check("Typography", "Font size", `${text.style.fontSize}px`, rule["font-size"]);
    }
    const fp = [child.paddingTop || 0, child.paddingRight || 0, child.paddingBottom || 0, child.paddingLeft || 0];
    check("Layout", "Padding", fp.map((v) => `${v}px`).join(" "), pad4(rule.padding).map((v) => `${v}px`).join(" "));
    check("Layout", "Corner radius", `${child.cornerRadius || 0}px`, `${px(rule["border-radius"]) || 0}px`);
    const hasStroke = (child.strokes || []).some((s) => s.visible !== false);
    const cssBorderW = px((rule.border || "").split(/\s+/)[0]) || 0;
    check("Layout", "Stroke width", `${hasStroke ? child.strokeWeight || 0 : 0}px`, `${cssBorderW}px`);

    const fillVar = boundId(child.fills);
    const bg = rule.background || rule["background-color"];
    if (fillVar) check("Colors", "Background", varIdToCss[fillVar] || fillVar, cssVarOf(bg) || bg);
    else if (bg && !/transparent|none/.test(bg)) add("Colors", `Background (${label})`, "no fill", bg);
    const strokeVar = boundId(child.strokes);
    if (strokeVar) check("Colors", "Border color", varIdToCss[strokeVar] || strokeVar, cssVarOf(rule["border-color"]) || rule["border-color"]);
    const textVar = text && boundId(text.fills);
    if (textVar) check("Colors", "Text color", varIdToCss[textVar] || textVar, cssVarOf(rule.color) || rule.color);
  }
  return diffs;
}

// ---------- Run ----------
const components = Object.entries(map).filter(([k]) => !k.startsWith("$"));
let results = [], error = null;
try {
  const data = await loadFigma(components.map(([, e]) => e.figmaSetId));
  results = components.map(([name, entry]) => {
    const node = data.nodes?.[entry.figmaSetId]?.document;
    if (!node) return { name, entry, error: `Figma node ${entry.figmaSetId} not found.` };
    return { name, entry, diffs: compare(name, entry, node) };
  });
} catch (e) { error = e.message; }

// ---------- Write the Storybook page ----------
const figmaUrl = (id) => `https://www.figma.com/design/${FILE_KEY}/DS-Workflow-test?node-id=${id.replace(":", "-")}`;
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/[{}<>]/g, (c) => `&#${c.charCodeAt(0)};`);
let mdx = `{/* GENERATED by scripts/check-sync.mjs. Do not edit. */}
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Status/Sync status" summary="Generated comparison of Figma components and code: properties, variants, typography, layout, colors." />

# Sync status

Compares each Figma component with its code. Last checked: **${today}**.


> **No alerts yet.** Differences are only shown on this page. They don't fail any build, send notifications or open issues, and an unreadable Figma file (e.g. an expired token) is only shown here too. Check this page regularly until alerts are set up.

`;
if (error) {
  mdx += `> **Not checked.** ${esc(error)}\n`;
} else {
  mdx += `| Component | Status | Figma | Docs |\n|---|---|---|---|\n`;
  for (const r of results) {
    const status = r.error ? "❓ could not check" : r.diffs.length ? `⚠️ ${r.diffs.length} difference${r.diffs.length > 1 ? "s" : ""}` : "✅ in sync";
    mdx += `| ${r.name} | ${status} | <a href="${figmaUrl(r.entry.figmaSetId)}" target="_blank">Open in Figma</a> | <a href="./?path=/docs/components-${r.name.toLowerCase()}--docs" target="_top">Docs</a> |\n`;
  }
  for (const r of results) {
    if (r.error) { mdx += `\n## ${r.name}\n\n> ${esc(r.error)}\n`; continue; }
    if (!r.diffs.length) continue;
    mdx += `\n## ${r.name}\n\n| Area | Difference | Figma | Code |\n|---|---|---|---|\n`;
    for (const d of r.diffs) mdx += `| ${d.area} | ${esc(d.what)} | \`${esc(d.figma)}\` | \`${esc(d.code)}\` |\n`;
  }
}
writeFileSync(OUT, mdx);
console.log(error ? `sync check: not checked (${error})` : `sync check: ${results.map((r) => `${r.name} ${r.error ? "error" : r.diffs.length + " diffs"}`).join(", ")}`);
