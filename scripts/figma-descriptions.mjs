// Reads `figma-description:<key>:` lines from each component's MDX and maps them to Figma node IDs
// via figma/component-map.json. Output: figma/descriptions.json { nodeId: { name, description } }.
//   figma-description:set:      -> the component set (figmaSetId)
//   figma-description:<variant>: -> each variant (variants.<variant>.nodeId)
import { readFileSync, writeFileSync } from "node:fs";

const map = JSON.parse(readFileSync("figma/component-map.json", "utf8"));
const out = {};
const read = (mdx, key, component) => {
  const m = new RegExp(`\\{\\/\\*\\s*figma-description:${key}:\\s*([\\s\\S]*?)\\*\\/\\}`).exec(mdx);
  if (!m) throw new Error(`Missing figma-description:${key} in ${component}.mdx`);
  return m[1].trim().replace(/\s+/g, " ");
};
for (const [component, entry] of Object.entries(map)) {
  if (component.startsWith("$")) continue;
  const mdx = readFileSync(entry.code.replace(/\.jsx$/, ".mdx"), "utf8");
  if (entry.figmaSetId) out[entry.figmaSetId] = { name: component, description: read(mdx, "set", component) };
  for (const [variant, figmaNode] of Object.entries(entry.variants)) {
    out[figmaNode.nodeId] = { name: figmaNode.figmaName, description: read(mdx, variant, component) };
  }
}
writeFileSync("figma/descriptions.json", JSON.stringify(out, null, 2) + "\n");
console.log(`figma descriptions: ${Object.values(out).map((d) => d.name).join(", ")}`);
