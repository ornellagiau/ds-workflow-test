// Runs inside Figma (Claude via Figma MCP "use_figma"). One-way: Storybook MDX -> Figma.
// Updates (1) the component description and (2) the canvas doc card "doc:<nodeId>" > "description".
// Paste figma/descriptions.json into DESCRIPTIONS. Never edit these texts in Figma.
const DESCRIPTIONS = /* paste figma/descriptions.json here */ {};
const result = [];
for (const [nodeId, { name, description }] of Object.entries(DESCRIPTIONS)) {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET")) { result.push(`NOT FOUND: ${name} (${nodeId})`); continue; }
  node.description = `${description}\nSource: Storybook (auto-synced, do not edit here)`;

  const page = node.parent.type === "PAGE" ? node.parent : figma.currentPage;
  const card = page.findOne(n => n.type === "FRAME" && n.name === `doc:${nodeId}`);
  const textNode = card && card.findOne(n => n.type === "TEXT" && n.name === "description");
  if (textNode) {
    await figma.loadFontAsync(textNode.fontName);
    textNode.characters = description;
    result.push(`updated: ${name} (${nodeId}) + canvas card`);
  } else {
    result.push(`updated: ${name} (${nodeId}), no canvas card found`);
  }
}
return result;
