import { addons } from "storybook/manager-api";
import theme from "./theme";

addons.setConfig({
  theme,
  // Readers only see doc pages. Stories still appear inside the docs as live examples.
  sidebar: {
    showRoots: true,
    filters: { docsOnly: (item) => item.type !== "story" },
  },
  showToolbar: false,
  showPanel: false,
});
