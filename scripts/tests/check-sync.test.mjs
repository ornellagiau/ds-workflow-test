// Tests for scripts/check-sync.mjs. Each test changes the code or the Figma test data on purpose and checks what the page says.
// The baseline is scripts/fixtures/figma-sync.json: values read from the real Figma files on 28 Oct 2026.
import { test } from "node:test";
import assert from "node:assert/strict";
import { append, card, edit, rows, runSync, section } from "./helpers.mjs";

const LINK_CSS = "src/components/Link/Link.css";
const TOKENS_CSS = "src/components/Link/Link.tokens.css";

test("baseline: Link in sync (light and dark), Button shows only the padding demo", () => {
  const r = runSync();
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(card(r.page, "Link"), ["ok", "In sync"]);
  assert.deepEqual(card(r.page, "Button"), ["warn", "1 difference"]);
  assert.match(r.page, /Padding/);
  assert.match(r.page, /30 variants · light and dark/);
});

test("CSS drift: a wrong underline on secondary hover is flagged in light and dark", () => {
  const r = runSync({ mutate: edit(LINK_CSS, ".ds-link--secondary:hover .ds-link__content { border-bottom-color: var(--link-border-primary-idle); }", ".ds-link--secondary:hover .ds-link__content { border-bottom-color: var(--link-border-secondary-idle); }") });
  const found = rows(r.page, "Link", "Underline color");
  assert.equal(found.length, 2, found.join("\n"));
  assert.ok(found.every((l) => l.includes("Emphasis=Secondary, State=Hover")));
});

test("token drift in dark only: the dark text color is flagged, light is untouched", () => {
  const r = runSync({ mutate: edit(TOKENS_CSS, "--link-content-primary-idle: #F9F9FA;", "--link-content-primary-idle: #EEEEEE;") });
  const found = rows(r.page, "Link", "Text color");
  assert.ok(found.length > 0);
  assert.ok(found.every((l) => l.includes("dark") && !l.includes("light")), found.join("\n"));
});

test("a removed pressed rule gives color differences for every emphasis, listed once each", () => {
  const r = runSync({ mutate: edit(LINK_CSS, ".ds-link:active { color: var(--color-content-secondary-idle-default); }", ".ds-link:focus { color: red; }") });
  const sec = section(r.page, "Link");
  assert.match(sec, /Text color/);
  assert.equal(sec.split("Emphasis=Primary, State=Pressed").length - 1, 2);   // light and dark
  assert.match(sec, /Emphasis=Quiet, State=Pressed/);
});

test("an @media block is reported as not read, and nothing else changes", () => {
  const r = runSync({ mutate: append(LINK_CSS, "\n@media (max-width: 600px) { .ds-link { color: red; } }\n") });
  assert.equal(r.status, 0);
  assert.match(r.page, /Not read by the check/);
  assert.match(r.page, /@media/);
  assert.deepEqual(card(r.page, "Link"), ["ok", "In sync"]);
});

test("a nested rule is reported as not read", () => {
  const r = runSync({ mutate: append(LINK_CSS, "\n.ds-link { &:hover { color: red; } }\n") });
  assert.equal(r.status, 0);
  assert.match(r.page, /nested rules/);
});

test("Figma returns light colors for the dark frame: dark is skipped with a note, no false differences", () => {
  const r = runSync({
    fixtureMutate: (fx) => {
      const light = fx.nodes["85:227"].document.children, dark = fx.nodes["160:98"].document.children;
      light.forEach((l, i) => { dark[i].children = JSON.parse(JSON.stringify(l.children)); dark[i].strokes = l.strokes || []; });
    },
  });
  assert.match(r.page, /Figma returned the light colors/);
  assert.deepEqual(card(r.page, "Link"), ["ok", "In sync"]);
});

test("a missing dark frame: note, light is still compared", () => {
  const r = runSync({ fixtureMutate: (fx) => { delete fx.nodes["160:98"]; } });
  assert.match(r.page, /dark frame 160:98 was not found/);
  assert.deepEqual(card(r.page, "Link"), ["ok", "In sync"]);
});

test("a renamed Figma property is reported in both directions", () => {
  const r = runSync({ fixtureMutate: (fx) => { const defs = fx.nodes["85:227"].document.componentPropertyDefinitions; defs["Link Label#79:48"] = defs["Link Text#79:48"]; delete defs["Link Text#79:48"]; } });
  const sec = section(r.page, "Link");
  assert.match(sec, /Figma property "Link Label" is not used/);
  assert.match(sec, /expects the Figma property "Link Text"/);
});

test("a code prop that no longer exists is reported", () => {
  const r = runSync({ mutate: edit("src/components/Link/Link.jsx", '  emphasis = "primary",        // "primary" | "secondary" | "quiet"\n', "") });
  assert.match(section(r.page, "Link"), /code prop "emphasis"/);
});

test("Button: a changed color in the code is flagged with both hex values", () => {
  const r = runSync({ mutate: edit("src/components/Button/Button.css", "background: #4705C3;", "background: #FF0000;") });
  const sec = section(r.page, "Button");
  assert.match(sec, /Background/);
  assert.match(sec, /#4705C3/);
  assert.match(sec, /#FF0000/);
});

test("a new Figma state that is not in the map is reported", () => {
  const r = runSync({ fixtureMutate: (fx) => { fx.nodes["85:227"].document.componentPropertyDefinitions.State.variantOptions.push("Loading"); } });
  assert.match(section(r.page, "Link"), /State=Loading exists in Figma only/);
});

test("a CSS modifier without a Figma variant is reported", () => {
  const r = runSync({ mutate: append(LINK_CSS, "\n.ds-link--xl { font-size: 20px; }\n") });
  assert.match(section(r.page, "Link"), /\.ds-link--xl exists in code only/);
});

test("a missing token variable is shown as unresolved, not as a wrong color", () => {
  const r = runSync({ mutate: edit(TOKENS_CSS, "--link-border-secondary-idle: #29293A;", "") });
  assert.match(section(r.page, "Link"), /unresolved var\(--link-border-secondary-idle\)/);
});

test("no Figma token and no test data: the page says Not checked, no crash", () => {
  const r = runSync({ noFixture: true });
  assert.equal(r.status, 0);
  assert.match(r.page, /Not checked/);
  assert.match(r.page, /FIGMA_ACCESS_TOKEN/);
});

test("a wrong disabled color in the code flags the Disabled variants", () => {
  const r = runSync({ mutate: edit(LINK_CSS, '[aria-disabled="true"] { color: var(--link-content-primary-disabled);', '[aria-disabled="true"] { color: var(--link-content-primary-idle);') });
  const sec = section(r.page, "Link");
  assert.match(sec, /Text color/);
  assert.match(sec, /State=Disabled/);
});

test("dark instances without layers: note, no false differences", () => {
  const r = runSync({ fixtureMutate: (fx) => { for (const dk of fx.nodes["160:98"].document.children) dk.children = []; } });
  assert.match(r.page, /no readable layers/);
  assert.deepEqual(card(r.page, "Link"), ["ok", "In sync"]);
});

test("a renamed Figma layer is reported as layer not found", () => {
  const r = runSync({ fixtureMutate: (fx) => { for (const v of fx.nodes["85:227"].document.children) for (const c of v.children) if (c.name === "Content") c.name = "Inhalt"; } });
  assert.match(section(r.page, "Link"), /layer not found/);
});

test("a component whose Figma node is gone: row says could not check, no crash, Button unaffected", () => {
  const r = runSync({ fixtureMutate: (fx) => { delete fx.nodes["85:227"]; } });
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(card(r.page, "Link"), ["muted", "Could not check"]);
  assert.deepEqual(card(r.page, "Button"), ["warn", "1 difference"]);
  assert.match(r.page, /node 85:227 not found/);
});

test("a component that could not be checked is never shown as in sync", () => {
  const r = runSync({ noFixture: true });
  const c = card(r.page, "Link");
  assert.ok(c === null || c[0] !== "ok");
});
