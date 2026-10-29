import { createElement } from "react";
import { addons, types } from "storybook/manager-api";
import { IconButton } from "storybook/internal/components";
import { SunIcon, MoonIcon } from "@storybook/icons";
import theme from "./theme";
import { mode, saveMode } from "./mode";

addons.setConfig({
  theme,
  // Readers only see doc pages. Stories still appear inside the docs as live examples.
  sidebar: {
    showRoots: true,
    filters: { docsOnly: (item) => item.type !== "story" },
  },
  // The toolbar only holds the light/dark switch.
  showToolbar: true,
  showPanel: false,
});

// Light/dark switch: saves the choice in this browser and reloads, so the sidebar and the page both use it.
addons.register("ds/theme-switch", () => {
  addons.add("ds/theme-switch/tool", {
    type: types.TOOLEXTRA,
    title: "Light or dark",
    match: () => true,
    render: () => {
      const dark = mode() === "dark";
      return createElement(
        IconButton,
        { key: "ds-theme-switch", title: dark ? "Switch to light" : "Switch to dark", onClick: () => { saveMode(dark ? "light" : "dark"); window.location.reload(); } },
        createElement(dark ? SunIcon : MoonIcon),
      );
    },
  });
});
