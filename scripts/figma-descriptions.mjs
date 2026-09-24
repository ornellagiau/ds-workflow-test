// Reads `figma-description:<variant>:` lines from each component's MDX and maps them to Figma node IDs
// via figma/component-map.json. Output: figma/descriptions.json { nodeId: description }.
import { readFileSync, writeFileSync } from "node:fs";

const map = JSON.parse(readFileSync("figma/component-map.json", "utf8"));
const out = {};
for (const [component, entry] of Object.entries(map)) {
  if (component.startsWith("$")) continue;
  const mdx = readFileSync(entry.code.replace(/\.jsx$/, ".mdx"), "utf8");
  for (const [variant, figmaNode] of Object.entries(entry.variants)) {
    const m = new RegExp(`\\{\\/\\*\\s*figma-description:${variant}:\\s*([\\s\\S]*?)\\*\\/\\}`).exec(mdx);
    if (!m) throw new Error(`Missing figma-description:${variant} in ${component}.mdx`);
    out[figmaNode.nodeId] = { name: figmaNode.figmaName, description: m[1].trim().replace(/\s+/g, " ") };
  }
}
writeFileSync("figma/descriptions.json", JSON.stringify(out, null, 2) + "\n");
console.log(`figma descriptions: ${Object.values(out).map((d) => d.name).join(", ")}`);
