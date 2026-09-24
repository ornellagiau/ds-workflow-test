// Runs inside Figma (Claude via Figma MCP "use_figma"). Returns tokens.json content (W3C DTCG format).
// Read-only. Copy the returned JSON into tokens/tokens.json and open a PR.
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const hex = c => "#" + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const out = { $description: `Exported from Figma file ${figma.fileKey}. Do not edit by hand.` };
for (const c of cols) {
  const mode = c.modes[0]; // single-mode test file; multi-mode needs one file or group per mode
  const group = (out[c.name] = { $extensions: { "com.figma": { mode: mode.name } } });
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v.resolvedType !== "COLOR") continue;
    const raw = v.valuesByMode[mode.modeId];
    let $value;
    if (raw.type === "VARIABLE_ALIAS") {
      const t = await figma.variables.getVariableByIdAsync(raw.id);
      const tc = await figma.variables.getVariableCollectionByIdAsync(t.variableCollectionId);
      $value = `{${[tc.name, ...t.name.split("/")].join(".")}}`;
    } else $value = hex(raw);
    const path = v.name.split("/");
    let node = group;
    for (const seg of path.slice(0, -1)) node = node[seg] ??= {};
    node[path.at(-1)] = {
      $type: "color", $value,
      ...(v.description ? { $description: v.description } : {}),
      $extensions: { "com.figma": { variableId: v.id, scopes: v.scopes, hiddenFromPublishing: v.hiddenFromPublishing } },
    };
  }
}
return JSON.stringify(out, null, 2);
