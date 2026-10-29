import { create } from "storybook/theming";
import { mode } from "./mode";

const shared = {
  brandTitle: "Turm design system",
  brandUrl: "./",
  brandTarget: "_self",
  fontBase: '"Inter", system-ui, sans-serif',
  fontCode: 'ui-monospace, "SF Mono", Menlo, monospace',
  appBorderRadius: 10,
};

// Calm and clean: neutral grays, one quiet accent (Turm green), Inter.
// Light colors are Turm light tokens: Content/Primary #29293A, Content/Secondary #5C5E6A, Content/Highlight #006A64.
export const lightTheme = create({
  base: "light",
  ...shared,
  colorPrimary: "#006A64",
  colorSecondary: "#006A64",
  appBg: "#F7F7F8",
  appContentBg: "#FFFFFF",
  appPreviewBg: "#FFFFFF",
  appBorderColor: "#E4E4E8",
  textColor: "#29293A",
  textMutedColor: "#5C5E6A",
  textInverseColor: "#FFFFFF",
  barBg: "#FFFFFF",
  barTextColor: "#5C5E6A",
  barSelectedColor: "#006A64",
  barHoverColor: "#29293A",
});

// Dark colors are Turm dark tokens: Background/Primary #1B1C26, Content/Primary #F9F9FA, Content/Secondary #C0C1C6,
// Content/Highlight #C4E8E3, Border/Primary #383948.
export const darkTheme = create({
  base: "dark",
  ...shared,
  colorPrimary: "#C4E8E3",
  colorSecondary: "#C4E8E3",
  appBg: "#15161E",
  appContentBg: "#1B1C26",
  appPreviewBg: "#1B1C26",
  appBorderColor: "#383948",
  textColor: "#F9F9FA",
  textMutedColor: "#C0C1C6",
  textInverseColor: "#1B1C26",
  barBg: "#1B1C26",
  barTextColor: "#C0C1C6",
  barSelectedColor: "#C4E8E3",
  barHoverColor: "#F9F9FA",
});

export default mode() === "dark" ? darkTheme : lightTheme;
