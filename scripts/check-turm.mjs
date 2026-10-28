// Daily check of the Turm Foundations file in Figma (REST API, read-only).
// Keeps a log of changes, writes the Storybook page "Status/Turm updates" and, when something happened,
// the text for a GitHub issue comment. The workflow turns that text into an issue, which GitHub emails.
//
//   status/turm-log.json        history (committed by the workflow only when it changed)
//   src/docs/TurmStatus.mdx     generated page, do not edit
//   status/turm-notify.md       exists only when a notification is needed
//
// Counts every save in Turm's version history, not only token changes. If the version history is not
// available (token scope), it falls back to one check per day (at most one change per day is seen).
// Never fails the build: problems are shown on the page and in the log.
// The repo is public, so the log keeps only timestamps and opaque version ids (no names, no labels).
// Tests: set TURM_FIXTURE_DIR (file.json, versions.json) and TURM_NOW instead of calling Figma.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const FILE_KEY = "MepRgN24p5VtYVZf1IZer7";
const FILE_URL = `https://www.figma.com/design/${FILE_KEY}`;
const API = "https://api.figma.com";
const LOG = "status/turm-log.json";
const PAGE = "src/docs/TurmStatus.mdx";
const NOTIFY = "status/turm-notify.md";
const PAGE_LINK = "https://ornellagiau.github.io/ds-workflow-test/?path=/docs/status-turm-updates--docs";
const MAX_EVENTS = 500;
const DAY = 86400000;
const now = process.env.TURM_NOW ? new Date(process.env.TURM_NOW) : new Date();

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const fmt = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
};
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/[{}<>]/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------- Figma ----------
async function getJson(urlOrPath) {
  if (process.env.TURM_FIXTURE_DIR) {
    const name = urlOrPath.includes("/versions") ? "versions" : "file";
    const f = `${process.env.TURM_FIXTURE_DIR}/${name}.json`;
    if (!existsSync(f)) throw new Error("Figma answered 404 Not Found");
    const data = JSON.parse(readFileSync(f, "utf8"));
    if (data.__status) throw new Error(`Figma answered ${data.__status}`);
    return data;
  }
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error("FIGMA_ACCESS_TOKEN is not set.");
  const res = await fetch(urlOrPath.startsWith("http") ? urlOrPath : API + urlOrPath, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`Figma answered ${res.status} ${res.statusText}`);
  return res.json();
}

async function readVersions(maxPages) {
  let url = `/v1/files/${FILE_KEY}/versions`;
  const events = [];
  for (let page = 0; url && page < maxPages; page++) {
    const data = await getJson(url);
    if (!Array.isArray(data.versions)) throw new Error("no versions in the answer");
    for (const v of data.versions) if (v.id && v.created_at) events.push({ id: String(v.id), at: v.created_at, source: "versions" });
    url = data.pagination && data.pagination.next_page ? data.pagination.next_page : null;
  }
  return events;
}

// ---------- Log ----------
mkdirSync("status", { recursive: true });
mkdirSync("src/docs", { recursive: true });
const firstRun = !existsSync(LOG);
const log = firstRun
  ? { fileKey: FILE_KEY, startedAt: now.toISOString(), lastStatus: null, versionsOk: null, events: [] }
  : JSON.parse(readFileSync(LOG, "utf8"));
rmSync(NOTIFY, { force: true });

let error = null;
let newEvents = [];
try {
  const file = await getJson(`/v1/files/${FILE_KEY}?depth=1`);
  log.lastModified = file.lastModified || log.lastModified || null;
  let events = null;
  try {
    events = await readVersions(firstRun ? 5 : 1);
    log.versionsOk = true;
    delete log.versionsError;
  } catch (e) {
    log.versionsOk = false;
    log.versionsError = e.message;
  }
  if (!events) events = [{ id: String(file.version), at: file.lastModified, source: "polling" }];
  const known = new Set(log.events.map((e) => e.id));
  newEvents = events.filter((e) => e.id && e.at && !known.has(e.id));
  log.events = [...newEvents, ...log.events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_EVENTS);
} catch (e) {
  error = e.message;
}
const status = error ? "failed" : "ok";
const previousStatus = log.lastStatus;
log.lastCheck = { at: now.toISOString(), ok: !error, error };
log.lastStatus = status;

// ---------- Numbers ----------
function stats(events) {
  const times = events.map((e) => Date.parse(e.at)).filter(Number.isFinite);
  const within = (days) => times.filter((t) => now - t <= days * DAY).length;
  const oldest = times.length ? Math.min(...times) : now.getTime();
  const spanDays = Math.max(1, Math.min(28, (now - oldest) / DAY));
  return {
    total: times.length,
    c7: within(7),
    c30: within(30),
    activeDays30: new Set(times.filter((t) => now - t <= 30 * DAY).map((t) => new Date(t).toISOString().slice(0, 10))).size,
    perWeek: times.length ? Math.round((within(28) / spanDays) * 7 * 10) / 10 : 0,
  };
}
const s = stats(log.events);
const lastEdit = log.lastModified || (log.events[0] && log.events[0].at) || null;

// ---------- Notification ----------
const parts = [];
if (error && previousStatus !== "failed") {
  parts.push(`**The Turm check failed.** ${error}. The token may have expired or has no access to the file. The page shows the last known numbers.`);
} else if (!error && previousStatus === "failed") {
  parts.push("**The Turm check works again.**");
}
if (!error && firstRun) {
  parts.push(`**Tracking of Turm started.** Latest edit: ${lastEdit ? fmt(lastEdit) : "unknown"}. ${s.total} earlier changes were found in the history.`);
} else if (!error && newEvents.length) {
  parts.push(
    `**Turm changed.** ${newEvents.length} new save${newEvents.length > 1 ? "s" : ""} since the last check. Latest edit: ${lastEdit ? fmt(lastEdit) : "unknown"}. Changes in the last 7 days: ${s.c7}.\n\nTokens may have changed. Open a chat with Claude and ask for the exact token check.\n\n_This counts every save, not only token changes._`
  );
}
if (parts.length) writeFileSync(NOTIFY, parts.join("\n\n") + `\n\n[Turm updates page](${PAGE_LINK})\n`);

// ---------- Page ----------
const recent = log.events.slice(0, 10).map((e) => `| ${fmt(e.at)} | ${e.source === "versions" ? "version history" : "daily check"} |`).join("\n");
let mdx = `{/* GENERATED by scripts/check-turm.mjs. Do not edit. */}
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Status/Turm updates" summary="How often the Turm Foundations file in Figma changes. Generated daily." />

# Turm updates

How often the Turm Foundations file in Figma changes. Last checked: **${fmt(log.lastCheck.at)}**. <a href="${FILE_URL}" target="_blank">Open Turm in Figma</a>

> This counts every save in the Figma version history, not only token changes. ${log.versionsOk === false ? "The version history was not available, so at most one change per day is counted." : "Scheduled runs can be late by hours, the times come from Figma."}
`;
if (error) mdx += `\n> **Not checked.** ${esc(error)}. ${s.total ? "The numbers below are from the last successful check." : ""}\n`;
if (s.total) {
  mdx += `
| | |
|---|---|
| Last edit | ${lastEdit ? fmt(lastEdit) : "unknown"} |
| Changes in the last 7 days | ${s.c7} |
| Changes in the last 30 days | ${s.c30} (on ${s.activeDays30} days) |
| Average per week (last 4 weeks) | ${s.perWeek} |
| Tracking since | ${fmt(log.startedAt)} |

## Latest changes
| When | Source |
|---|---|
${recent}
`;
} else if (!error) {
  mdx += "\nNo changes found yet.\n";
}
writeFileSync(LOG, JSON.stringify(log, null, 2) + "\n");
writeFileSync(PAGE, mdx);
console.log(error ? `turm check: not checked (${error})` : `turm check: ok, ${newEvents.length} new, ${s.c7} in 7 days, ${s.c30} in 30 days${parts.length ? ", notification written" : ""}`);
