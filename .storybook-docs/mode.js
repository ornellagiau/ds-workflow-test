// Light or dark for the docs: the reader's choice (saved in this browser) or, if there is none, the system setting.
const KEY = "ds-theme";
export function mode() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage not available */ }
  if (saved === "dark" || saved === "light") return saved;
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
export function saveMode(m) {
  try { localStorage.setItem(KEY, m); } catch (e) { /* storage not available */ }
}
