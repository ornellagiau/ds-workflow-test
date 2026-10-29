// Tests for scripts/turm-log.sh against a simulated remote (a local bare repository).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const git = (cwd, ...args) => spawnSync("git", args, { cwd, encoding: "utf8" });
const sh = (cwd, args, env = {}) => spawnSync("bash", ["scripts/turm-log.sh", ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });

function setup() {
  const base = mkdtempSync(join(tmpdir(), "turmlog-"));
  const origin = join(base, "origin.git");
  git(base, "init", "--bare", "-b", "main", origin);
  const work = join(base, "work");
  git(base, "clone", "-q", origin, work);
  git(work, "config", "user.email", "t@example.com"); git(work, "config", "user.name", "t");
  git(work, "checkout", "-q", "-B", "main");
  mkdirSync(join(work, "scripts"), { recursive: true });
  cpSync(join(ROOT, "scripts/turm-log.sh"), join(work, "scripts/turm-log.sh"));
  writeFileSync(join(work, "README.md"), "x\n");
  git(work, "add", "-A"); git(work, "commit", "-q", "-m", "init"); git(work, "push", "-q", "origin", "main");
  return { base, origin, work };
}
const writeLog = (work, text) => { mkdirSync(join(work, "status"), { recursive: true }); writeFileSync(join(work, "status/turm-log.json"), text); };
const show = (origin, ref, path) => git(origin, "show", `${ref}:${path}`);

test("default mode: the log is committed to the default branch, and an unchanged log is not committed again", () => {
  const { base, origin, work } = setup();
  try {
    writeLog(work, '{"events":[1]}\n');
    assert.equal(sh(work, ["save"]).status, 0);
    assert.equal(show(origin, "main", "status/turm-log.json").stdout, '{"events":[1]}\n');
    const again = sh(work, ["save"]);
    assert.match(again.stdout, /No log change/);
    writeLog(work, '{"events":[1,2]}\n');
    sh(work, ["save"]);
    assert.equal(show(origin, "main", "status/turm-log.json").stdout, '{"events":[1,2]}\n');
    assert.equal(git(origin, "rev-list", "--count", "main").stdout.trim(), "3");   // init + two log commits
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("branch mode: the log goes to its own branch and the default branch stays untouched", () => {
  const { base, origin, work } = setup();
  try {
    const env = { TURM_LOG_BRANCH: "turm-data" };
    writeLog(work, '{"events":[1]}\n');
    assert.equal(sh(work, ["save"], env).status, 0);
    assert.equal(show(origin, "turm-data", "status/turm-log.json").stdout, '{"events":[1]}\n');
    assert.notEqual(show(origin, "main", "status/turm-log.json").status, 0, "main must not get the log");
    assert.equal(git(origin, "rev-list", "--count", "main").stdout.trim(), "1");
    // second run with a change, then a run without a change
    writeLog(work, '{"events":[1,2]}\n');
    sh(work, ["save"], env);
    assert.equal(show(origin, "turm-data", "status/turm-log.json").stdout, '{"events":[1,2]}\n');
    assert.match(sh(work, ["save"], env).stdout, /No log change/);
    assert.equal(git(origin, "rev-list", "--count", "turm-data").stdout.trim(), "2");
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("branch mode: restore brings the log into a fresh checkout, and does nothing before the first run", () => {
  const { base, origin, work } = setup();
  try {
    const env = { TURM_LOG_BRANCH: "turm-data" };
    const fresh0 = join(base, "fresh0"); git(base, "clone", "-q", origin, fresh0); cpSync(join(ROOT, "scripts/turm-log.sh"), join(fresh0, "scripts/turm-log.sh"), { recursive: true });
    assert.match(sh(fresh0, ["restore"], env).stdout, /first run/);
    assert.equal(existsSync(join(fresh0, "status/turm-log.json")), false);
    writeLog(work, '{"events":[1,2,3]}\n');
    sh(work, ["save"], env);
    const fresh = join(base, "fresh"); git(base, "clone", "-q", origin, fresh);
    assert.equal(sh(fresh, ["restore"], env).status, 0);
    assert.equal(readFileSync(join(fresh, "status/turm-log.json"), "utf8"), '{"events":[1,2,3]}\n');
    // without the variable nothing is restored
    assert.match(sh(fresh, ["restore"], {}).stdout, /nothing to restore/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("a push that fails does not fail the run", () => {
  const { base, work } = setup();
  try {
    git(work, "remote", "set-url", "origin", join(base, "does-not-exist.git"));
    writeLog(work, '{"events":[1]}\n');
    const r = sh(work, ["save"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout + r.stderr, /Push skipped/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("usage error for an unknown command", () => {
  const { base, work } = setup();
  try { assert.equal(sh(work, ["nonsense"]).status, 2); } finally { rmSync(base, { recursive: true, force: true }); }
});
