// Compares the Figma components with the real implementation and writes src/docs/SyncStatus.mdx (Storybook page "Status/Sync status").
//
// Figma side: REST API (needs FIGMA_ACCESS_TOKEN with file_content:read). The component set and, for dark mode, a frame with
//             instances of all variants and the Turm color mode set to dark ("Link dark (sync check)").
// Code side:  the component's .css (read by a small CSS engine), its tokens .css (light and dark values), its .jsx props and
//             its Code Connect template (.figma.ts).
// Mapping:    figma/component-map.json ("sync" per component). Adding a component means adding data there, not code here.
// The contract is NOT the reference: the check compares Figma with what the code really does.
// Tests without Figma: FIGMA_FIXTURE=scripts/fixtures/figma-sync.json node scripts/check-sync.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const map = JSON.parse(readFileSync("figma/component-map.json", "utf8"));
const FILE_KEY = map.$fileKey;
const OUT = "src/docs/SyncStatus.mdx";
const today = new Date().toISOString().slice(0, 10);
const warnings = [];
const warn = (m) => { if (!warnings.includes(m)) warnings.push(m); };

// ================= small helpers =================
const SIDES = ["top", "right", "bottom", "left"];
const COLOR_RE = /^(#[0-9a-f]{3,8}|var\(.*\)|rgba?\(.*\)|transparent|currentcolor)$/i;
const INHERITED = ["color", "font-family", "font-weight", "font-size", "line-height", "letter-spacing"];
function splitTop(v) {
  const out = []; let cur = "", depth = 0;
  for (const ch of v.trim()) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const four = (p) => [p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]];
const px = (v) => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "thin") return 1; if (s === "medium") return 3; if (s === "thick") return 5;
  const m = /^(-?[\d.]+)(px)?$/.exec(s);
  return m ? parseFloat(m[1]) : null;
};
const pxText = (n) => `${Math.round(n * 100) / 100}px`;
const hex2 = (x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0").toUpperCase();

// ================= CSS: parser, cascade, values =================
function parseCss(css, file) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = []; let i = 0, order = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth > 0) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    i = j;
    if (head.startsWith("@")) { warn(`${file}: the block ${head.split(/\s/)[0]} is not read by the check.`); continue; }
    if (/[{}]/.test(body)) { warn(`${file}: nested rules in "${head}" are not read by the check.`); continue; }
    const decls = body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const k = d.indexOf(":"); if (k < 0) return null;
      const rawProp = d.slice(0, k).trim(); let value = d.slice(k + 1).trim(); let important = false;
      if (/!important\s*$/i.test(value)) { important = true; value = value.replace(/!important\s*$/i, "").trim(); }
      return { prop: rawProp.startsWith("--") ? rawProp : rawProp.toLowerCase(), value, important };
    }).filter(Boolean);
    for (const sel of head.split(",").map((s) => s.trim()).filter(Boolean)) rules.push({ selector: sel, decls, order: order++ });
  }
  return rules;
}
function expand(prop, value) {
  const parts = splitTop(value);
  const color = parts.find((p) => COLOR_RE.test(p));
  const width = parts.find((p) => /^-?[\d.]+(px)?$/i.test(p) || /^(thin|medium|thick)$/i.test(p));
  const style = parts.find((p) => /^(none|solid|dashed|dotted|double|hidden)$/i.test(p));
  const out = [];
  const line = (name) => {
    if (style) out.push([`${name}-style`, style.toLowerCase()]);
    if (width !== undefined) out.push([`${name}-width`, width]);
    if (color) out.push([`${name}-color`, color]);
  };
  if (prop === "border") SIDES.forEach((s) => line(`border-${s}`));
  else if (/^border-(top|right|bottom|left)$/.test(prop)) line(prop);
  else if (prop === "outline") line("outline");
  else if (prop === "border-color") four(parts).forEach((c, k) => out.push([`border-${SIDES[k]}-color`, c]));
  else if (prop === "border-width") four(parts).forEach((c, k) => out.push([`border-${SIDES[k]}-width`, c]));
  else if (prop === "border-style") four(parts).forEach((c, k) => out.push([`border-${SIDES[k]}-style`, c]));
  else if (prop === "padding") four(parts).forEach((c, k) => out.push([`padding-${SIDES[k]}`, c]));
  else if (prop === "background") { if (color) out.push(["background-color", color]); else if (/^none$/i.test(value.trim())) out.push(["background-color", "transparent"]); }
  else out.push([prop, value]);
  return out;
}
const normAttr = (t) => t.replace(/["']/g, "").replace(/\s+/g, "");
function parseSelector(sel, file) {
  if (/[>+~]|::|:not\(|:is\(|:where\(|:has\(/.test(sel)) { warn(`${file}: the selector "${sel}" is not read by the check.`); return null; }
  const compounds = sel.trim().split(/\s+/).map((c) => {
    const classes = new Set(), conds = new Set();
    for (const t of c.match(/\.[\w-]+|:[\w-]+|\[[^\]]+\]|#[\w-]+|\*|[a-zA-Z][\w-]*/g) || []) {
      if (t.startsWith(".")) classes.add(t.slice(1));
      else if (t.startsWith(":")) conds.add(t);
      else if (t.startsWith("[")) conds.add(normAttr(t));
    }
    return { classes, conds };
  });
  return { compounds, spec: compounds.reduce((n, c) => n + (c.classes.size + c.conds.size) * 10, 0) };
}
function matches(parsed, chain, idx) {
  const cs = parsed.compounds;
  const ok = (c, el) => [...c.classes].every((x) => el.classes.has(x)) && [...c.conds].every((x) => el.conds.has(x));
  if (!ok(cs[cs.length - 1], chain[idx])) return false;
  let a = idx - 1;
  for (let i = cs.length - 2; i >= 0; i--) {
    while (a >= 0 && !ok(cs[i], chain[a])) a--;
    if (a < 0) return false;
    a--;
  }
  return true;
}
const cmpRank = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
function computeStyle(rules, chain, idx) {
  const win = {};
  for (const r of rules) {
    if (!r.parsed || !matches(r.parsed, chain, idx)) continue;
    for (const d of r.decls) {
      if (d.prop.startsWith("--")) continue;
      for (const [p, v] of expand(d.prop, d.value)) {
        const rank = [d.important ? 1 : 0, r.parsed.spec, r.order];
        if (!win[p] || cmpRank(rank, win[p].rank) >= 0) win[p] = { value: v, rank };
      }
    }
  }
  const out = {};
  for (const [p, w] of Object.entries(win)) out[p] = w.value;
  if (idx > 0) { const parent = computeStyle(rules, chain, idx - 1); for (const p of INHERITED) if (out[p] === undefined && parent[p] !== undefined) out[p] = parent[p]; }
  return out;
}
function resolveVars(value, vars, depth = 0) {
  if (depth > 6) return null;
  const m = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/.exec(value);
  if (!m) return value;
  const found = vars[m[1]] ?? m[2];
  if (found === undefined) return null;
  return resolveVars(value.replace(m[0], found.trim()), vars, depth + 1);
}
function colorOf(value, style, vars) {
  if (value === undefined) return "unset";
  let v = resolveVars(value, vars);
  if (v === null) return `unresolved ${value}`;
  v = v.trim();
  if (/^currentcolor$/i.test(v)) return style.color === undefined ? "unset" : colorOf(style.color, {}, vars);
  if (/^transparent$/i.test(v)) return "none";
  let m = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return `unresolved ${value}`;
    const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
    if (a < 0.005) return "none";
    return `#${h.slice(0, 6).toUpperCase()}${a < 0.995 ? `@${Math.round(a * 100)}%` : ""}`;
  }
  m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)$/i.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a < 0.005) return "none";
    return `#${[m[1], m[2], m[3]].map((x) => hex2(parseFloat(x) / 255)).join("")}${a < 0.995 ? `@${Math.round(a * 100)}%` : ""}`;
  }
  return `unresolved ${value}`;
}
// What the browser would paint for one property of one element
function cssValue(prop, style, vars) {
  const m = /^(border-(?:top|right|bottom|left)|outline)-(color|width)$/.exec(prop);
  if (m) {
    const [, prefix, kind] = m;
    const st = (style[`${prefix}-style`] || "none").toLowerCase();
    const width = px(style[`${prefix}-width`] ?? "medium");
    const visible = st !== "none" && st !== "hidden" && width > 0;
    const color = visible ? colorOf(style[`${prefix}-color`] ?? "currentcolor", style, vars) : "none";
    if (kind === "color") return color;
    return visible && color !== "none" ? pxText(width) : "0px";
  }
  if (prop === "color") return colorOf(style.color, style, vars);
  if (prop === "background-color") return style["background-color"] === undefined ? "none" : colorOf(style["background-color"], style, vars);
  if (prop === "font-family") return style["font-family"] ? style["font-family"].split(",")[0].trim().replace(/["']/g, "") : "unset";
  if (prop === "font-weight") return style["font-weight"] === undefined ? "unset" : String({ normal: 400, bold: 700 }[style["font-weight"]] ?? style["font-weight"]);
  if (prop === "font-size") return px(style["font-size"]) === null ? "unset" : pxText(px(style["font-size"]));
  if (prop === "border-radius") return pxText(px(String(style["border-radius"] ?? "0").split(/\s+/)[0]) ?? 0);
  return style[prop] === undefined ? "unset" : String(style[prop]);
}
function tokenVars(cssText, file) {
  const rules = parseCss(cssText, file);
  const light = {}, dark = {};
  for (const r of rules) {
    const target = r.selector === ":root" ? light : /^\[data-theme=["']?dark["']?\]$/.test(r.selector) ? dark : null;
    if (!target) { warn(`${file}: the selector "${r.selector}" is not read as a token block.`); continue; }
    for (const d of r.decls) if (d.prop.startsWith("--")) target[d.prop] = d.value;
  }
  return { light, dark: { ...light, ...dark } };
}

// ================= Figma =================
async function loadFigma(ids) {
  if (process.env.FIGMA_FIXTURE) return JSON.parse(readFileSync(process.env.FIGMA_FIXTURE, "utf8"));
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error("FIGMA_ACCESS_TOKEN is not set, so Figma could not be read.");
  const res = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${ids.join(",")}`, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`Figma API answered ${res.status} ${res.statusText}.`);
  return res.json();
}
const visiblePaint = (paints) => (paints || []).find((p) => p.visible !== false);
function paintHex(p) {
  if (!p || p.type !== "SOLID" || !p.color) return "none";
  const a = (p.opacity ?? 1) * (p.color.a ?? 1);
  if (a < 0.005) return "none";
  return `#${hex2(p.color.r)}${hex2(p.color.g)}${hex2(p.color.b)}${a < 0.995 ? `@${Math.round(a * 100)}%` : ""}`;
}
const findLayer = (node, spec) => {
  if (!spec || (!spec.name && !spec.type)) return node;
  const walk = (n) => {
    if ((!spec.name || n.name === spec.name) && (!spec.type || n.type === spec.type) && n !== node) return n;
    for (const c of n.children || []) { const f = walk(c); if (f) return f; }
    return null;
  };
  return walk(node);
};
const hasStroke = (n) => !!visiblePaint(n.strokes);
const bottomW = (n) => (n.individualStrokeWeights ? n.individualStrokeWeights.bottom || 0 : n.strokeWeight || 0);
const FIGMA_KINDS = {
  fill: (n) => paintHex(visiblePaint(n.fills)),
  textFill: (n) => paintHex(visiblePaint(n.fills)),
  stroke: (n) => (hasStroke(n) ? paintHex(visiblePaint(n.strokes)) : "none"),
  bottomStroke: (n) => (hasStroke(n) && bottomW(n) > 0 ? paintHex(visiblePaint(n.strokes)) : "none"),
  strokeWidth: (n) => pxText(hasStroke(n) ? n.strokeWeight || 0 : 0),
  bottomStrokeWidth: (n) => pxText(hasStroke(n) ? bottomW(n) : 0),
  padding: (n) => ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map((k) => pxText(n[k] || 0)).join(" "),
  cornerRadius: (n) => pxText(n.cornerRadius || 0),
  fontFamily: (n) => n.style?.fontFamily ?? "unset",
  fontWeight: (n) => (n.style?.fontWeight === undefined ? "unset" : String(n.style.fontWeight)),
  fontSize: (n) => (n.style?.fontSize === undefined ? "unset" : pxText(n.style.fontSize)),
};
const parseVariantName = (name) => Object.fromEntries(name.split(",").map((s) => s.trim().split("=")).filter((a) => a.length === 2));

// ================= code side per component =================
function elementChain(cfg, target, rootClasses, rootConds) {
  const names = []; for (let n = target; n; n = cfg.elements[n].parent) names.unshift(n);
  return names.map((n, i) => ({
    classes: new Set([...(cfg.elements[n].classes || []), ...(i === 0 ? rootClasses : [])]),
    conds: new Set(i === 0 ? rootConds : []),
  }));
}
function jsxProps(src) {
  const m = /export function \w+\(\s*\{([\s\S]*?)\}\s*\)\s*\{/.exec(src);
  if (!m) return null;
  const names = [];
  for (const part of m[1].replace(/\/\/.*$/gm, "").split(",")) { const id = /^\s*(?:\.\.\.)?(\w+)/.exec(part); if (id) names.push(id[1]); }
  return names;
}

// ================= compare one component =================
const collapseCount = (diffs, axis) => new Set(diffs.map((d) => [d.mode, d.area, d.what, d.figma, d.code].join("\u0000"))).size;
function compare(name, entry, setNode, darkRoot) {
  const cfg = entry.sync;
  const base = entry.code.replace(/\.jsx$/, "");
  const diffs = []; const notes = [];
  const add = (mode, area, what, figma, code, variant) => diffs.push({ mode, area, what, figma: figma ?? "—", code: code ?? "—", variant });

  const rules = parseCss(readFileSync(`${base}.css`, "utf8"), `${base}.css`);
  for (const r of rules) r.parsed = parseSelector(r.selector, `${base}.css`);
  const tokens = cfg.tokensCss ? tokenVars(readFileSync(cfg.tokensCss, "utf8"), cfg.tokensCss) : { light: {}, dark: {} };

  // ---- Properties: Figma vs Code Connect template vs the component's real props
  const defs = setNode.componentPropertyDefinitions || {};
  const figmaProps = Object.keys(defs).map((k) => k.split("#")[0]);
  const template = existsSync(`${base}.figma.ts`) ? readFileSync(`${base}.figma.ts`, "utf8") : null;
  if (template === null) add("all", "Code Connect", `No template ${base}.figma.ts`, null, null);
  else {
    const used = [...template.matchAll(/get(?:Enum|String|Boolean|InstanceSwap)\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const p of figmaProps) if (!used.includes(p)) add("all", "Properties", `Figma property "${p}" is not used in the Code Connect template`, p, null);
    for (const p of used) if (!figmaProps.includes(p)) add("all", "Properties", `The Code Connect template expects the Figma property "${p}"`, null, p);
  }
  const props = jsxProps(readFileSync(entry.code, "utf8"));
  if (!props) warn(`${entry.code}: the props could not be read, so the props check was skipped.`);
  else {
    for (const [figmaProp, codeProp] of Object.entries(entry.properties || {})) {
      if (!figmaProps.includes(figmaProp)) add("all", "Properties", `component-map.json lists the Figma property "${figmaProp}", it does not exist in Figma`, null, figmaProp);
      if (!props.includes(codeProp)) add("all", "Properties", `The code prop "${codeProp}" (Figma "${figmaProp}") does not exist in ${entry.code}`, figmaProp, null);
    }
  }

  // ---- Variants: Figma options vs what the CSS knows
  const allSelectors = rules.map((r) => r.selector).join(" ").replace(/["']/g, "");
  const cssModifiers = new Set([...allSelectors.matchAll(/\.([\w-]+--[\w-]+)/g)].map((m) => m[1]));
  const mappedClasses = new Set();
  for (const [axis, options] of Object.entries(cfg.axes)) {
    const def = defs[axis];
    if (!def || def.type !== "VARIANT") { add("all", "Variants", `component-map.json lists the Figma variant property "${axis}", it does not exist in Figma`, null, axis); continue; }
    for (const opt of def.variantOptions || []) {
      if (!(opt in options)) { add("all", "Variants", `${axis}=${opt} exists in Figma only (not mapped in component-map.json)`, opt, null); continue; }
      const v = options[opt];
      if (typeof v === "string") { mappedClasses.add(v); if (!allSelectors.includes(`.${v}`)) add("all", "Variants", `${axis}=${opt}: no CSS rule for .${v}`, opt, null); }
      else for (const c of v) if (!allSelectors.includes(c)) add("all", "Variants", `${axis}=${opt}: no CSS rule for ${c}`, opt, null);
    }
    for (const opt of Object.keys(options)) if (!(def.variantOptions || []).includes(opt)) add("all", "Variants", `${axis}=${opt} exists in component-map.json only, not in Figma`, null, opt);
  }
  for (const m of cssModifiers) if (!mappedClasses.has(m)) add("all", "Variants", `The CSS modifier .${m} exists in code only (not mapped to a Figma variant)`, null, `.${m}`);

  // ---- Styles per variant and mode
  const light = new Map((setNode.children || []).map((c) => [c.name, c]));
  let dark = null, darkNote = null;
  if (cfg.darkFrameId) {
    if (!darkRoot) darkNote = `The dark frame ${cfg.darkFrameId} was not found in Figma.`;
    else {
      dark = new Map((darkRoot.children || []).map((c) => [c.name, c]));
      const found = [...light.keys()].filter((k) => dark.has(k)).length;
      if (found < light.size / 2) { darkNote = `The dark frame has only ${found} of ${light.size} variants.`; dark = null; }
    }
  }
  const checks = [...cfg.checks];
  if (cfg.layout) {
    checks.push(
      { name: "Padding", area: "Layout", figma: { layer: "root", kind: "padding" }, css: { element: "root", prop: "padding" } },
      { name: "Corner radius", area: "Layout", figma: { layer: "root", kind: "cornerRadius" }, css: { element: "root", prop: "border-radius" } },
      { name: "Stroke width", area: "Layout", figma: { layer: "root", kind: "strokeWidth" }, css: { element: "root", prop: "border-top-width" } },
      { name: "Font family", area: "Typography", figma: { layer: "label", kind: "fontFamily" }, css: { element: "label", prop: "font-family" } },
      { name: "Font weight", area: "Typography", figma: { layer: "label", kind: "fontWeight" }, css: { element: "label", prop: "font-weight" } },
      { name: "Font size", area: "Typography", figma: { layer: "label", kind: "fontSize" }, css: { element: "label", prop: "font-size" } },
    );
  }
  const rows = [];
  for (const [vname, lightNode] of light) {
    const axes = parseVariantName(vname);
    const rootClasses = [], rootConds = [];
    let mapped = true;
    for (const [axis, options] of Object.entries(cfg.axes)) {
      const opt = axes[axis]; const v = opt === undefined ? undefined : options[opt];
      if (v === undefined) { mapped = false; break; }
      if (typeof v === "string") rootClasses.push(v); else rootConds.push(...v.map(normAttr));
    }
    if (!mapped) continue;
    for (const mode of dark ? ["light", "dark"] : ["light"]) {
      const node = mode === "light" ? lightNode : dark.get(vname);
      if (!node) { add(mode, "Dark frame", `Variant missing in the dark frame`, vname, null, vname); continue; }
      for (const c of checks) {
        const layerNode = findLayer(node, cfg.layers[c.figma.layer]);
        const figmaVal = layerNode ? FIGMA_KINDS[c.figma.kind](layerNode) : "layer not found";
        const chain = elementChain(cfg, c.css.element, rootClasses, rootConds);
        const style = computeStyle(rules, chain, chain.length - 1);
        let codeVal;
        if (c.css.prop === "padding") codeVal = SIDES.map((s) => pxText(px(style[`padding-${s}`]) ?? 0)).join(" ");
        else codeVal = cssValue(c.css.prop, style, tokens[mode]);
        rows.push({ mode, vname, axes, check: c, figmaVal, codeVal });
      }
    }
  }
  // dark values that Figma cannot give: if every dark value that must differ from light is the same as light, the API gave light values
  let darkReadable = !!dark;
  if (dark) {
    const darkRows = rows.filter((r) => r.mode === "dark");
    if (darkRows.length && darkRows.filter((r) => r.figmaVal === "layer not found").length / darkRows.length > 0.5) {
      darkReadable = false; darkNote = "The instances in the dark frame have no readable layers, so dark mode was not compared.";
    }
  }
  if (dark && darkReadable) {
    const byKey = new Map();
    for (const r of rows) { const k = `${r.vname}|${r.check.name}`; byKey.set(k, { ...(byKey.get(k) || {}), [r.mode]: r }); }
    const must = [...byKey.values()].filter((p) => p.light && p.dark && p.light.codeVal !== p.dark.codeVal);
    const same = must.filter((p) => p.light.figmaVal === p.dark.figmaVal);
    if (must.length >= 3 && same.length === must.length) { darkReadable = false; darkNote = "Figma returned the light colors for the dark frame, so dark mode was not compared."; }
  }
  for (const r of rows) {
    if (r.mode === "dark" && !darkReadable) continue;
    if (r.figmaVal !== r.codeVal) add(r.mode, r.check.area || "Colors", r.check.name, r.figmaVal, r.codeVal, r.vname);
  }
  notes.push(dark && darkReadable ? "Compared in light and dark mode." : `Compared in light mode only. ${darkNote ?? "No dark frame is set up."}`);
  return { diffs, notes, collapseAxis: cfg.collapseAxis, variantsCompared: light.size, shown: collapseCount(diffs, cfg.collapseAxis) };
}

// ================= run =================
const components = Object.entries(map).filter(([k]) => !k.startsWith("$"));
let results = [], error = null;
try {
  const ids = components.flatMap(([, e]) => [e.figmaSetId, e.sync.darkFrameId].filter(Boolean));
  const data = await loadFigma(ids);
  results = components.map(([name, entry]) => {
    const node = data.nodes?.[entry.figmaSetId]?.document;
    if (!node) return { name, entry, error: `Figma node ${entry.figmaSetId} not found.` };
    try { return { name, entry, ...compare(name, entry, node, entry.sync.darkFrameId ? data.nodes?.[entry.sync.darkFrameId]?.document : null) }; }
    catch (e) { return { name, entry, error: `The check failed for ${name}: ${e.message}` }; }
  });
} catch (e) { error = e.message; }

// ================= write the Storybook page =================
const figmaUrl = (id) => `https://www.figma.com/design/${FILE_KEY}/DS-Workflow-test?node-id=${id.replace(":", "-")}`;
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/[{}<>]/g, (c) => `&#${c.charCodeAt(0)};`);
function collapse(diffs, axis) {
  const groups = new Map();
  for (const d of diffs) {
    const axes = d.variant ? parseVariantName(d.variant) : null;
    const rest = axes ? Object.entries(axes).filter(([k]) => k !== axis).map(([k, v]) => `${k}=${v}`).join(", ") : "";
    const key = [d.mode, d.area, d.what, d.figma, d.code].join("\u0000");
    if (!groups.has(key)) groups.set(key, { ...d, labels: [] });
    { const label = rest || d.variant || ""; if (!groups.get(key).labels.includes(label)) groups.get(key).labels.push(label); }
  }
  return [...groups.values()];
}
let mdx = `{/* GENERATED by scripts/check-sync.mjs. Do not edit. */}
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Status/Sync status" summary="Generated comparison of the Figma components with the real code: properties, variants and colors in light and dark mode." />

# Sync status

Compares each Figma component with its **implementation** (not with the contract). Last checked: **${today}**.

> **No alerts.** Differences are only shown on this page. They don't fail any build and don't send an email. The email from the daily Turm check is about the Turm file, not about this. Check this page regularly.

`;
if (error) {
  mdx += `> **Not checked.** ${esc(error)}\n`;
} else {
  // Problems first, one compact row each; a row opens to its differences. Components that are in sync are folded into one group.
  const state = (r) => (r.error ? "error" : r.diffs.length ? "warn" : "ok");
  const order = { error: 0, warn: 1, ok: 2 };
  const sorted = [...results].sort((a, b) => order[state(a)] - order[state(b)] || a.name.localeCompare(b.name));
  const count = (st) => results.filter((r) => state(r) === st).length;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const problems = sorted.filter((r) => state(r) !== "ok"), oks = sorted.filter((r) => state(r) === "ok");
  mdx += `${plural(results.length, "component")}: **${count("ok")} in sync**, ${count("warn")} with differences, ${count("error")} could not be checked.\n\n`;
  const spans = (r) => {
    const st = state(r);
    const [cls, text] = st === "error" ? ["muted", "Could not check"] : st === "warn" ? ["warn", plural(r.shown, "difference")] : ["ok", "In sync"];
    const notesText = (r.notes || []).join(" ");   // a component that could not be checked has no notes
    const flagged = /not found|not compared|no readable|returned the light colors|has only \d+ of/.test(notesText);
    const mode = r.error ? "" : notesText.includes("light and dark") ? "light and dark" : flagged ? "light only, dark not compared" : "light only";
    const note = r.error ? "see details" : `${r.variantsCompared} variants · ${mode}`;
    const title = r.error ? "" : esc(notesText).replace(/"/g, "&quot;");
    return `<span className="ds-sync-name">${r.name}</span> <span className="ds-badge ds-badge-${cls}">${text}</span> <span className="ds-sync-note" title="${title}">${note}</span> <span className="ds-sync-links"><a href="${figmaUrl(r.entry.figmaSetId)}" target="_blank">Figma</a> <a href="./?path=/docs/components-${r.name.toLowerCase()}--docs" target="_top">Docs</a></span>`;
  };
  const body = (r) => {
    if (r.error) return `${esc(r.error)}\n`;
    let t = `${r.variantsCompared} Figma variants. ${r.notes.join(" ")}\n\n| Area | Difference | Figma | Code |\n|---|---|---|---|\n`;
    for (const d of collapse(r.diffs, r.collapseAxis)) {
      const where = [d.mode !== "all" ? d.mode : null, d.labels.filter(Boolean).slice(0, 6).join("; ") + (d.labels.length > 6 ? "; …" : "")].filter(Boolean).join(", ");
      t += `| ${d.area} | ${esc(d.what)}${where ? ` (${esc(where)})` : ""} | \`${esc(d.figma)}\` | \`${esc(d.code)}\` |\n`;
    }
    return t;
  };
  const open = problems.length <= 2 ? " open" : "";
  const plainRow = (r) => `<div className="ds-sync-row"><span className="ds-sync-spacer"></span>${spans(r)}</div>\n`;
  mdx += `<div className="ds-sync-list">\n`;
  for (const r of problems) mdx += `<details className="ds-sync-item"${open}>\n<summary className="ds-sync-row">${spans(r)}</summary>\n\n${body(r)}\n</details>\n`;
  if (oks.length && problems.length) mdx += `<details className="ds-sync-group">\n<summary className="ds-sync-row"><span className="ds-sync-name">In sync (${oks.length})</span></summary>\n<div>\n${oks.map(plainRow).join("")}</div>\n</details>\n`;
  else for (const r of oks) mdx += plainRow(r);
  mdx += `</div>\n\n`;
  if (warnings.length) mdx += `## Not read by the check\n\n${warnings.map((w) => `- ${esc(w)}`).join("\n")}\n`;
}
writeFileSync(OUT, mdx);
console.log(error ? `sync check: not checked (${error})` : `sync check: ${results.map((r) => `${r.name} ${r.error ? "error" : r.shown + " diffs"}`).join(", ")}${warnings.length ? `, ${warnings.length} warnings` : ""}`);
