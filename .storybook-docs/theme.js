import { create } from "storybook/theming";

// Neutral theme: grays, one quiet accent, Inter.
export default create({
  base: "light",
  brandTitle: "DS workflow test",
  brandUrl: "./",
  brandTarget: "_self",

  fontBase: '"Inter", system-ui, sans-serif',
  fontCode: 'ui-monospace, "SF Mono", Menlo, monospace',

  colorPrimary: "#1F2328",
  colorSecondary: "#1F2328",

  appBg: "#F6F7F8",
  appContentBg: "#FFFFFF",
  appPreviewBg: "#FFFFFF",
  appBorderColor: "#E4E6E9",
  appBorderRadius: 8,

  textColor: "#1F2328",
  textMutedColor: "#6B7178",
  textInverseColor: "#FFFFFF",

  barBg: "#FFFFFF",
  barTextColor: "#6B7178",
  barSelectedColor: "#1F2328",
  barHoverColor: "#1F2328",
});
