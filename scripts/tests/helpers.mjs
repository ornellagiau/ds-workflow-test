// Shared helpers for the tests: run a script in a temporary copy of the repo, change files on purpose, read the page.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Runs scripts/check-sync.mjs in a temp copy. mutate(dir) changes files, fixtureMutate(json) changes the Figma test data. */
export function runSync({ mutate, fixtureMutate, noFixture } = {}) {
  const d = mkdtempSync(join(tmpdir(), "sync-"));
  for (const sub of ["figma", "scripts", "src/components"]) cpSync(join(ROOT, sub), join(d, sub), { recursive: true });
  mkdirSync(join(d, "src/docs"), { recursive: true });
  const fx = JSON.parse(readFileSync(join(d, "scripts/fixtures/figma-sync.json"), "utf8"));
  if (fixtureMutate) fixtureMutate(fx);
  writeFileSync(join(d, "fx.json"), JSON.stringify(fx));
  if (mutate) mutate(d);
  const env = { ...process.env };
  delete env.FIGMA_ACCESS_TOKEN; delete env.FIGMA_FIXTURE;
  if (!noFixture) env.FIGMA_FIXTURE = join(d, "fx.json");
  const p = spawnSync("node", ["scripts/check-sync.mjs"], { cwd: d, env, encoding: "utf8" });
  const pagePath = join(d, "src/docs/SyncStatus.mdx");
  const page = existsSync(pagePath) ? readFileSync(pagePath, "utf8") : "";
  rmSync(d, { recursive: true, force: true });
  return { status: p.status, out: `${p.stdout}${p.stderr}`, page };
}

export const edit = (path, from, to) => (d) => {
  const f = join(d, path);
  const s = readFileSync(f, "utf8");
  assert.ok(s.includes(from), `${path} does not contain: ${from}`);
  writeFileSync(f, s.replace(from, to));
};
export const append = (path, text) => (d) => writeFileSync(join(d, path), readFileSync(join(d, path), "utf8") + text);

/** The block of an opened row (a component with differences). */
export function section(page, name) {
  const m = new RegExp(`<details className="ds-sync-item"[^>]*>\\n<summary className="ds-sync-row"><span className="ds-sync-name">${name}</span>(.*?)</details>`, "s").exec(page);
  return m ? m[1] : "";
}
/** [badge class, badge text] of a component's row, or null. */
export function card(page, name) {
  const m = new RegExp(`<(?:div|summary) className="ds-sync-row">(?:<span className="ds-sync-spacer"></span>)?<span className="ds-sync-name">${name}</span>\\s*<span className="ds-badge ds-badge-(\\w+)">([^<]*)</span>`).exec(page);
  return m ? [m[1], m[2]] : null;
}
export const rows = (page, name, text) => section(page, name).split("\n").filter((l) => l.includes(text));

/** Runs scripts/check-turm.mjs in a temp dir with fixture files. Returns the notification text (or null), the log and the page. */
export function makeTurm() {
  const d = mkdtempSync(join(tmpdir(), "turm-"));
  mkdirSync(join(d, "scripts")); mkdirSync(join(d, "fx"));
  cpSync(join(ROOT, "scripts/check-turm.mjs"), join(d, "scripts/check-turm.mjs"));
  return {
    dir: d,
    run(now, { file, versions } = {}, env = {}) {
      if (file !== undefined) writeFileSync(join(d, "fx/file.json"), JSON.stringify(file));
      if (versions !== undefined) writeFileSync(join(d, "fx/versions.json"), JSON.stringify(versions));
      const p = spawnSync("node", ["scripts/check-turm.mjs"], { cwd: d, encoding: "utf8", env: { ...process.env, TURM_FIXTURE_DIR: join(d, "fx"), TURM_NOW: now, ...env } });
      const read = (f) => (existsSync(join(d, f)) ? readFileSync(join(d, f), "utf8") : null);
      return { status: p.status, out: `${p.stdout}${p.stderr}`, notify: read("status/turm-notify.md"), log: read("status/turm-log.json") && JSON.parse(read("status/turm-log.json")), page: read("src/docs/TurmStatus.mdx") };
    },
    done() { rmSync(d, { recursive: true, force: true }); },
  };
}
