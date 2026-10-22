import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import data from "../../tokens/turm-colors.draft.json";

// Interactive map of which token points to which: primitives -> global tokens (Color/*) -> component tokens.
// Hover (or tap, to pin) a token: thin lines show what it points to and who uses it. Dashed lines skip the global tokens.
// Reads the same data as the naming map and the generated Color tokens page.

const ACCENT = "#009990";
const SOFT = "rgba(0,153,144,0.12)";
const SOFT_STRONG = "rgba(0,153,144,0.22)";
const LINE = "rgba(128,128,128,0.28)";

const prim = data.primitives;
const semantic = data.semantic.map(([name, light, dark]) => ({ name, light, dark }));
const isGlobal = (n) => n.startsWith("Color/");

// ---- ids: pf:<family> p:<primitive> g:<global token> c:<component> t:<component token>
const tokenId = (name) => (isGlobal(name) ? "g:" : "t:") + name;
const familyOf = (p) => p.split("/")[0];
const componentOf = (n) => n.split("/")[0];

// ---- graph per mode: refs[id] = what the token points to, users[id] = who points to it
function buildGraph(mode) {
  const refs = new Map(), users = new Map();
  for (const t of semantic) {
    const ref = t[mode];
    if (ref.startsWith("#")) continue;
    const [target] = ref.slice(2).split("@");
    const to = ref.startsWith("p:") ? "p:" + target : tokenId(target);
    const from = tokenId(t.name);
    refs.set(from, to);
    if (!users.has(to)) users.set(to, []);
    users.get(to).push(from);
  }
  return { refs, users };
}
const graphs = { light: buildGraph("light"), dark: buildGraph("dark") };

// ---- groups
const families = [...new Set(Object.keys(prim).map(familyOf))];
const primsOf = (f) => Object.keys(prim).filter((p) => familyOf(p) === f);
const globals = semantic.filter((t) => isGlobal(t.name)).map((t) => t.name);
const components = [...new Set(semantic.filter((t) => !isGlobal(t.name)).map((t) => componentOf(t.name)))].sort();
const tokensOf = (c) => semantic.filter((t) => !isGlobal(t.name) && componentOf(t.name) === c).map((t) => t.name);
const membersOf = (id) => (id.startsWith("pf:") ? primsOf(id.slice(3)).map((p) => "p:" + p) : id.startsWith("c:") ? tokensOf(id.slice(2)).map(tokenId) : [id]);
const groupOf = (id) => (id.startsWith("p:") ? "pf:" + familyOf(id.slice(2)) : id.startsWith("t:") ? "c:" + componentOf(id.slice(2)) : null);
const columnOf = (id) => (id.startsWith("p") && !id.startsWith("pf:") ? 0 : id.startsWith("pf:") ? 0 : id.startsWith("g:") ? 1 : 2);
const labelOf = (id) => (id.startsWith("g:") ? id.slice(8) : id.startsWith("t:") ? id.slice(2).split("/").slice(1).join("/") : id.slice(id.indexOf(":") + 1));

// ---- chain: follow up (what it points to) and down (who uses it)
function chain(ids, mode) {
  const { refs, users } = graphs[mode];
  const nodes = new Set(ids), edges = new Set();
  const up = [...ids];
  while (up.length) { const id = up.pop(); const to = refs.get(id); if (to) { edges.add(`${to}>${id}`); if (!nodes.has(to)) { nodes.add(to); up.push(to); } } }
  const down = [...ids];
  while (down.length) { const id = down.pop(); for (const u of users.get(id) || []) { edges.add(`${id}>${u}`); if (!nodes.has(u)) { nodes.add(u); down.push(u); } } }
  return { nodes, edges };
}

const hexOf = (id, mode) => { // resolve a node to a color
  let cur = id;
  for (let i = 0; i < 6; i++) { if (cur.startsWith("p:")) return prim[cur.slice(2)]; const to = graphs[mode].refs.get(cur); if (!to) return null; cur = to; }
  return null;
};
const pl = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const nice = (id) => (id.startsWith("g:") ? id.slice(2) : id.startsWith("t:") ? id.slice(2) : id.slice(id.indexOf(":") + 1));

function describe(id, mode) {
  const { refs } = graphs[mode];
  const members = membersOf(id);
  if (id.startsWith("pf:") || id.startsWith("c:")) {
    const { nodes } = chain(members, mode);
    const g = [...nodes].filter((n) => n.startsWith("g:") && !members.includes(n)).length;
    const p = [...nodes].filter((n) => n.startsWith("p:") && !members.includes(n)).length;
    const t = [...nodes].filter((n) => n.startsWith("t:") && !members.includes(n)).length;
    return `${labelOf(id)}: ${members.length} ${id.startsWith("pf:") ? "primitives" : "tokens"}. Connected to ${[p && pl(p, "primitive"), g && pl(g, "global token"), t && pl(t, "component token")].filter(Boolean).join(", ") || "no other tokens"} (${mode}).`;
  }
  if (id.startsWith("p:")) {
    const { nodes } = chain([id], mode);
    const g = [...nodes].filter((n) => n.startsWith("g:")).length, t = [...nodes].filter((n) => n.startsWith("t:")).length;
    return `${nice(id)} ${prim[id.slice(2)]}. Used by ${g} global and ${t} component tokens (${mode}).`;
  }
  const path = [id]; let cur = id;
  for (let i = 0; i < 6 && refs.has(cur); i++) { cur = refs.get(cur); path.push(cur); }
  const down = chain([id], mode).nodes; down.delete(id);
  const usedBy = [...down].filter((n) => !path.includes(n));
  const comps = [...new Set(usedBy.filter((n) => n.startsWith("t:")).map((n) => componentOf(n.slice(2))))];
  const hex = hexOf(id, mode);
  return `${path.map(nice).join(" → ")}${hex ? " " + hex : ""} (${mode}).` + (usedBy.length ? ` Used by ${usedBy.length} ${usedBy.some((n) => n.startsWith("t:")) ? "component tokens" : "tokens"}${comps.length ? " in " + comps.slice(0, 6).join(", ") + (comps.length > 6 ? ", ..." : "") : ""}.` : " Not used by any other token.");
}

export default function TokenChain() {
  const wrap = useRef(null);
  const nodeRefs = useRef({});
  const leaveTimer = useRef(null);
  const [mode, setMode] = useState("light");
  const [open, setOpen] = useState({});
  const [hover, setHover] = useState(null);
  const [pin, setPin] = useState(null);
  const [lines, setLines] = useState([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tick, setTick] = useState(0);
  const active = pin || hover;

  const enter = (id) => { clearTimeout(leaveTimer.current); setHover(id); };
  const leave = () => { clearTimeout(leaveTimer.current); leaveTimer.current = setTimeout(() => setHover(null), 140); };

  // the node that is shown for an id: the member if its group is open, otherwise the group
  const shown = (id) => { const g = groupOf(id); return g && !open[g] ? g : id; };

  const { lit, edges } = useMemo(() => {
    if (!active) return { lit: new Set(), edges: [] };
    const { nodes, edges: e } = chain(membersOf(active), mode);
    const litSet = new Set();
    for (const n of nodes) { litSet.add(shown(n)); const g = groupOf(n); if (g) litSet.add(g); }
    litSet.add(active);
    const seen = new Set(), out = [];
    for (const k of e) {
      const [a, b] = k.split(">"); const from = shown(a), to = shown(b);
      if (columnOf(from) >= columnOf(to)) continue; // same column (component to component): no line
      const key = `${from}>${to}`; if (seen.has(key)) continue; seen.add(key);
      out.push({ from, to, skip: columnOf(from) === 0 && columnOf(to) === 2 });
    }
    return { lit: litSet, edges: out };
  }, [active, mode, open]);

  useEffect(() => {
    const onResize = () => setTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(leaveTimer.current); };
  }, []);

  useLayoutEffect(() => {
    const box = wrap.current;
    if (!box) return;
    const b = box.getBoundingClientRect();
    setSize({ w: b.width, h: b.height });
    const out = [];
    for (const e of edges) {
      const a = nodeRefs.current[e.from], c = nodeRefs.current[e.to];
      if (!a || !c) continue;
      const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect();
      const x1 = ra.right - b.left - 4, y1 = ra.top + ra.height / 2 - b.top;
      const x2 = rc.left - b.left + 4, y2 = rc.top + rc.height / 2 - b.top;
      const dx = Math.max(30, (x2 - x1) / 2);
      out.push({ d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, x1, y1, x2, y2, skip: e.skip });
    }
    setLines(out);
  }, [edges, tick, open]);

  const summary = active ? describe(active, mode) : "Hover or tap a token to follow its chain. Open a group with the arrow. Dashed lines skip the global tokens.";

  const node = (id, { group = false, label, count }) => {
    const on = lit.has(id), dim = active && !on, me = active === id;
    return (
      <div key={id} style={{ display: "flex", alignItems: "stretch", margin: "0 0 2px" }}>
        {group && (
          <button
            type="button"
            aria-expanded={!!open[id]}
            aria-label={(open[id] ? "Close " : "Open ") + label}
            onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}
            style={{ font: "inherit", fontSize: 11, width: 20, border: "none", background: "transparent", cursor: "pointer", color: "inherit", opacity: dim ? 0.3 : 0.7, padding: 0 }}
          >{open[id] ? "▾" : "▸"}</button>
        )}
        <button
          type="button"
          data-id={id}
          ref={(el) => (nodeRefs.current[id] = el)}
          aria-pressed={pin === id}
          onMouseEnter={() => enter(id)}
          onMouseLeave={leave}
          onFocus={() => enter(id)}
          onBlur={leave}
          onClick={() => setPin(pin === id ? null : id)}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flex: 1,
            font: "inherit", fontSize: 13, lineHeight: 1.4, textAlign: "left", cursor: "pointer",
            padding: "3px 8px", marginLeft: group ? 0 : 20, borderRadius: 6, border: "none",
            background: me ? SOFT_STRONG : on ? SOFT : "transparent", color: on ? ACCENT : "inherit",
            fontWeight: me || group ? 600 : 400, opacity: dim ? 0.3 : 1, transition: "opacity .15s, background .15s", overflowWrap: "anywhere",
          }}
        >
          <span>{label}</span>
          {count !== undefined && <span style={{ fontSize: 11, opacity: 0.55, fontVariantNumeric: "tabular-nums", fontWeight: 400 }}>{count}</span>}
        </button>
      </div>
    );
  };

  const colHead = (t) => <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, marginBottom: 10 }}>{t}</div>;
  const colStyle = (ci) => ({ position: "relative", padding: ci ? "0 16px" : "0 16px 0 0", borderLeft: ci ? `1px solid ${LINE}` : "none" });

  return (
    <div style={{ margin: "20px 0" }}>
      <div role="group" aria-label="Mode" style={{ display: "inline-flex", border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
        {["light", "dark"].map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            style={{ font: "inherit", fontSize: 13, padding: "4px 14px", border: "none", cursor: "pointer", background: mode === m ? SOFT_STRONG : "transparent", color: mode === m ? ACCENT : "inherit", fontWeight: mode === m ? 600 : 400 }}>{m}</button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <div ref={wrap} style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", minWidth: 720 }}>
          <svg width={size.w} height={size.h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
            <style>{`@keyframes tc-fade{from{opacity:0}to{opacity:1}} .tc-line{animation:tc-fade .16s ease-out}`}</style>
            {lines.map((l, i) => (
              <g key={i} className="tc-line">
                <path d={l.d} fill="none" stroke={ACCENT} strokeWidth="1.25" opacity="0.5" strokeDasharray={l.skip ? "4 3" : undefined} />
                <circle cx={l.x1} cy={l.y1} r="2.5" fill={ACCENT} opacity="0.7" />
                <circle cx={l.x2} cy={l.y2} r="2.5" fill={ACCENT} opacity="0.7" />
              </g>
            ))}
          </svg>
          <div style={colStyle(0)}>
            {colHead("Primitives")}
            {families.map((f) => (
              <div key={f}>
                {node("pf:" + f, { group: true, label: f, count: primsOf(f).length })}
                {open["pf:" + f] && primsOf(f).map((p) => node("p:" + p, { label: p.includes("/") ? p.split("/")[1] : p }))}
              </div>
            ))}
          </div>
          <div style={colStyle(1)}>
            {colHead("Global tokens")}
            {globals.map((g) => node("g:" + g, { label: g.slice(6) }))}
          </div>
          <div style={colStyle(2)}>
            {colHead("Component tokens")}
            {components.map((c) => (
              <div key={c}>
                {node("c:" + c, { group: true, label: c, count: tokensOf(c).length })}
                {open["c:" + c] && tokensOf(c).map((t) => node("t:" + t, { label: t.split("/").slice(1).join("/") }))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p aria-live="polite" style={{ fontSize: 13, minHeight: 40, margin: "14px 0 0", paddingTop: 10, borderTop: `1px solid ${LINE}`, opacity: 0.85 }}>{summary}</p>
    </div>
  );
}
