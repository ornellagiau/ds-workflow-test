// Runs inside Figma (Claude via Figma MCP "use_figma"). One-way: Storybook MDX -> Figma.
// Paste figma/descriptions.json into DESCRIPTIONS. Never edit these descriptions in Figma.
const DESCRIPTIONS = /* paste figma/descriptions.json here */ {};
const result = [];
for (const [nodeId, { name, description }] of Object.entries(DESCRIPTIONS)) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET")) { result.push(`NOT FOUND: ${name} (${nodeId})`); continue; }
  node.description = `${description}\nSource: Storybook (auto-synced, do not edit here)`;
  result.push(`updated: ${name} (${nodeId})`);
}
return result;
