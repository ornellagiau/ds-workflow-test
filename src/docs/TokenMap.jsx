import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import data from "../../tokens/turm-colors.json";

// Interactive map of the token naming: Component -> Element -> Role -> State -> Variant.
// Hover (or tap, to pin) a name: thin lines show which other names exist together with it.
// Reads the same data as the generated Color tokens page, so it cannot go out of date.

const COLS = [
  { key: "component", label: "Component" },
  { key: "element", label: "Element" },
  { key: "role", label: "Role" },
  { key: "state", label: "State" },
  { key: "variant", label: "Variant" },
];
const ELEMENTS = ["Surface", "Background", "Border", "Content", "Logo"];
const STATES = ["Idle", "Hover", "Active", "Focused", "Selected", "Disabled", "Error", "Warning", "Success"];

// Calm palette: one accent, everything else is the text color at low opacity (works in light and dark docs).
const ACCENT = "#009990";
const SOFT = "rgba(0,153,144,0.12)";
const SOFT_STRONG = "rgba(0,153,144,0.22)";
const LINE = "rgba(128,128,128,0.28)";

// "Color/Surface/Error" has no Role: a lone last word counts as State if it is a state word.
function parse(name) {
  const [component, element, ...rest] = name.split("/");
  let role = null, state = null, variant = null;
  if (rest.length === 3) [role, state, variant] = rest;
  else if (rest.length === 2) [role, state] = rest;
  else if (rest.length === 1) (STATES.includes(rest[0]) ? (state = rest[0]) : (role = rest[0]));
  return { component, element, role, state, variant };
}

const tokens = data.semantic.map(([name]) => parse(name));

function buildColumns() {
  const count = (key) => {
    const m = new Map();
    for (const t of tokens) if (t[key]) m.set(t[key], (m.get(t[key]) || 0) + 1);
    return m;
  };
  const byOrder = (order) => (a, b) => order.indexOf(a) - order.indexOf(b);
  const counts = { component: count("component"), element: count("element"), role: count("role"), state: count("state"), variant: count("variant") };
  return {
    counts,
    list: {
      component: [...counts.component.keys()].sort((a, b) => (a === "Color" ? -1 : b === "Color" ? 1 : a.localeCompare(b))),
      element: [...counts.element.keys()].sort(byOrder(ELEMENTS)),
      role: [...counts.role.keys()].sort((a, b) => counts.role.get(b) - counts.role.get(a)),
      state: [...counts.state.keys()].sort(byOrder(STATES)),
      variant: [...counts.variant.keys()],
    },
  };
}
const { counts, list: columns } = buildColumns();

const nodeKey = (col, value) => `${col}:${value}`;

export default function TokenMap() {
  const wrap = useRef(null);
  const nodeRefs = useRef({});
  const leaveTimer = useRef(null);
  const [hover, setHover] = useState(null);
  const [pin, setPin] = useState(null);
  const [lines, setLines] = useState([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tick, setTick] = useState(0);
  const active = pin || hover;

  // A short delay before clearing avoids flicker while the pointer crosses the gaps between names.
  const enter = (v) => { clearTimeout(leaveTimer.current); setHover(v); };
  const leave = () => { clearTimeout(leaveTimer.current); leaveTimer.current = setTimeout(() => setHover(null), 140); };

  const match = useMemo(() => (active ? tokens.filter((t) => t[active.col] === active.value) : []), [active]);

  // Every token is a path through the columns. Empty slots are skipped, so a line may jump over a column.
  const { edges, lit } = useMemo(() => {
    const edges = new Set(), lit = new Set();
    for (const t of match) {
      const slots = COLS.filter((c) => t[c.key]).map((c) => nodeKey(c.key, t[c.key]));
      slots.forEach((s) => lit.add(s));
      for (let i = 0; i < slots.length - 1; i++) edges.add(`${slots[i]}>${slots[i + 1]}`);
    }
    return { edges, lit };
  }, [match]);

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
      const [from, to] = e.split(">");
      const a = nodeRefs.current[from], c = nodeRefs.current[to];
      if (!a || !c) continue;
      const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect();
      const x1 = ra.right - b.left - 4, y1 = ra.top + ra.height / 2 - b.top;
      const x2 = rc.left - b.left + 4, y2 = rc.top + rc.height / 2 - b.top;
      const dx = Math.max(24, (x2 - x1) / 2);
      out.push({ d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, x1, y1, x2, y2 });
    }
    setLines(out);
  }, [edges, tick]);

  const summary = active
    ? (() => {
        const parts = COLS.filter((c) => c.key !== active.col)
          .map((c) => {
            const vals = columns[c.key].filter((v) => match.some((t) => t[c.key] === v));
            return vals.length ? `${c.label}s: ${vals.join(", ")}` : null;
          })
          .filter(Boolean);
        return `${active.value}: ${match.length} tokens${parts.length ? " · " + parts.join(" · ") : ""}`;
      })()
    : "Hover or tap a name to see which elements, roles and states exist with it.";

  const isActive = (col, v) => active && active.col === col && active.value === v;

  return (
    <div style={{ margin: "20px 0" }}>
      <div style={{ overflowX: "auto" }}>
        <div ref={wrap} style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(5, minmax(130px, 1fr))", minWidth: 720 }}>
          <svg width={size.w} height={size.h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
            <style>{`@keyframes tm-fade{from{opacity:0}to{opacity:1}} .tm-line{animation:tm-fade .16s ease-out}`}</style>
            {lines.map((l, i) => (
              <g key={i} className="tm-line">
                <path d={l.d} fill="none" stroke={ACCENT} strokeWidth="1.25" opacity="0.5" />
                <circle cx={l.x1} cy={l.y1} r="2.5" fill={ACCENT} opacity="0.7" />
                <circle cx={l.x2} cy={l.y2} r="2.5" fill={ACCENT} opacity="0.7" />
              </g>
            ))}
          </svg>
          {COLS.map((c, ci) => (
            <div key={c.key} style={{ position: "relative", padding: ci ? "0 16px" : "0 16px 0 0", borderLeft: ci ? `1px solid ${LINE}` : "none" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, marginBottom: 10 }}>{c.label}</div>
              {columns[c.key].map((v) => {
                const k = nodeKey(c.key, v);
                const on = lit.has(k), dim = active && !on, me = isActive(c.key, v);
                return (
                  <button
                    key={k}
                    type="button"
                    data-label={v}
                    ref={(el) => (nodeRefs.current[k] = el)}
                    aria-pressed={!!(pin && pin.col === c.key && pin.value === v)}
                    onMouseEnter={() => enter({ col: c.key, value: v })}
                    onMouseLeave={leave}
                    onFocus={() => enter({ col: c.key, value: v })}
                    onBlur={leave}
                    onClick={() => setPin(pin && pin.col === c.key && pin.value === v ? null : { col: c.key, value: v })}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, width: "100%",
                      font: "inherit", fontSize: 13, lineHeight: 1.4, textAlign: "left", cursor: "pointer",
                      margin: "0 0 2px", padding: "4px 8px", borderRadius: 6, border: "none",
                      background: me ? SOFT_STRONG : on ? SOFT : "transparent",
                      color: on ? ACCENT : "inherit", fontWeight: me ? 600 : 400,
                      opacity: dim ? 0.3 : 1, transition: "opacity .15s, background .15s",
                    }}
                  >
                    <span>{v}</span>
                    <span style={{ fontSize: 11, opacity: 0.55, fontVariantNumeric: "tabular-nums" }}>{counts[c.key].get(v)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p aria-live="polite" style={{ fontSize: 13, minHeight: 40, margin: "14px 0 0", paddingTop: 10, borderTop: `1px solid ${LINE}`, opacity: 0.85 }}>{summary}</p>
    </div>
  );
}
