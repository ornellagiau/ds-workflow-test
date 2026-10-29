// Tests for scripts/check-turm.mjs with Figma test data: first run, no change, new saves, a save the version history does not list yet,
// a failing check (one notification, not one per day), recovery, and the privacy rule (no names or labels in the log).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTurm } from "./helpers.mjs";

const file = (lastModified, version) => ({ name: "Turm", lastModified, version });
const versions = (...v) => ({ versions: v.map(([id, at]) => ({ id, created_at: at, user: { handle: "SOMEONE" }, label: "secret label" })), pagination: {} });

test("first run: tracking started, history read, no names or labels in the log", () => {
  const t = makeTurm();
  try {
    const r = t.run("2026-10-28T06:00:00Z", { file: file("2026-10-27T14:02:00Z", "900"), versions: versions(["900", "2026-10-27T14:02:00Z"], ["899", "2026-10-26T09:00:00Z"], ["897", "2026-10-01T09:00:00Z"]) });
    assert.equal(r.status, 0, r.out);
    assert.match(r.notify, /Tracking of Turm started/);
    assert.match(r.notify, /3 changes found/);
    assert.equal(r.log.events.length, 3);
    assert.doesNotMatch(JSON.stringify(r.log), /SOMEONE|secret label/);
    assert.match(r.page, /Turm updates/);
  } finally { t.done(); }
});

test("the next day without a change: no notification", () => {
  const t = makeTurm();
  try {
    const d = { file: file("2026-10-27T14:02:00Z", "900"), versions: versions(["900", "2026-10-27T14:02:00Z"]) };
    t.run("2026-10-28T06:00:00Z", d);
    assert.equal(t.run("2026-10-29T06:00:00Z").notify, null);
  } finally { t.done(); }
});

test("two new saves: one notification that lists them", () => {
  const t = makeTurm();
  try {
    t.run("2026-10-28T06:00:00Z", { file: file("2026-10-27T14:02:00Z", "900"), versions: versions(["900", "2026-10-27T14:02:00Z"]) });
    const r = t.run("2026-10-30T06:00:00Z", { file: file("2026-10-29T16:00:00Z", "902"), versions: versions(["902", "2026-10-29T16:00:00Z"], ["901", "2026-10-29T10:00:00Z"], ["900", "2026-10-27T14:02:00Z"]) });
    assert.match(r.notify, /Turm changed/);
    assert.match(r.notify, /2 new saves/);
    assert.match(r.notify, /- 29 Oct 2026, 16:00 UTC/);
  } finally { t.done(); }
});

test("a save that the version history does not list yet is noticed at once, and counted once when the history catches up", () => {
  const t = makeTurm();
  try {
    t.run("2026-10-28T04:30:00Z", { file: file("2026-10-28T04:24:49Z", "V1"), versions: versions(["V1", "2026-10-28T04:25:39Z"], ["V0", "2026-10-22T14:05:03Z"]) });
    const second = t.run("2026-10-28T04:42:53Z", { file: file("2026-10-28T04:38:23Z", "V1") });   // saved 13 minutes later, no new version yet
    assert.match(second.notify, /Turm changed/);
    assert.equal(second.log.events.filter((e) => e.id.startsWith("lm:")).length, 1);
    const third = t.run("2026-10-29T04:00:00Z", { file: file("2026-10-28T04:38:23Z", "V2"), versions: versions(["V2", "2026-10-28T04:39:10Z"], ["V1", "2026-10-28T04:25:39Z"], ["V0", "2026-10-22T14:05:03Z"]) });
    assert.equal(third.notify, null, "the same save must not be reported twice");
    assert.equal(third.log.events.length, 3);
    assert.equal(third.log.events.filter((e) => e.id.startsWith("lm:")).length, 0);
  } finally { t.done(); }
});

test("a refused version history falls back to the last-modified time", () => {
  const t = makeTurm();
  try {
    const r = t.run("2026-10-28T06:00:00Z", { file: file("2026-10-22T19:24:08Z", "9"), versions: { __status: "403 Forbidden" } });
    assert.equal(r.log.versionsOk, false);
    assert.match(r.notify, /version history is not available/);
    assert.match(r.page, /at most one change per day/);
  } finally { t.done(); }
});

test("a failing check notifies once, not every day, and tells when it works again", () => {
  const t = makeTurm();
  try {
    t.run("2026-10-28T06:00:00Z", { file: file("2026-10-27T14:02:00Z", "900"), versions: versions(["900", "2026-10-27T14:02:00Z"]) });
    const failed = t.run("2026-10-29T06:00:00Z", { file: { __status: "403 Forbidden" } });
    assert.match(failed.notify, /check failed/);
    assert.match(failed.page, /Not checked/);
    assert.equal(t.run("2026-10-30T06:00:00Z").notify, null);
    const back = t.run("2026-10-31T06:00:00Z", { file: file("2026-10-27T14:02:00Z", "900") });
    assert.match(back.notify, /works again/);
  } finally { t.done(); }
});

test("the notification links to the docs site from DOCS_URL, or derives the address from the repository name", () => {
  const t = makeTurm();
  try {
    const d = { file: file("2026-10-27T14:02:00Z", "900"), versions: versions(["900", "2026-10-27T14:02:00Z"]) };
    assert.match(t.run("2026-10-28T06:00:00Z", d, { DOCS_URL: "https://docs.example.org/design/" }).notify, /\(https:\/\/docs\.example\.org\/design\/\?path=\/docs\/status-turm-updates--docs\)/);
  } finally { t.done(); }
  const t2 = makeTurm();
  try {
    const d = { file: file("2026-10-27T14:02:00Z", "900"), versions: versions(["900", "2026-10-27T14:02:00Z"]) };
    assert.match(t2.run("2026-10-28T06:00:00Z", d, { GITHUB_REPOSITORY: "SZ-Org/design-system" }).notify, /https:\/\/sz-org\.github\.io\/design-system\/\?path=/);
  } finally { t2.done(); }
  const t3 = makeTurm();
  try {
    const d = { file: file("2026-10-27T14:02:00Z", "900"), versions: versions(["900", "2026-10-27T14:02:00Z"]) };
    const r = t3.run("2026-10-28T06:00:00Z", d, { DOCS_URL: "", GITHUB_REPOSITORY: "" });
    assert.doesNotMatch(r.notify, /Turm updates page/);
  } finally { t3.done(); }
});
