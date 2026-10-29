import "./docs.css";
import theme from "./theme";

export default {
  parameters: {
    layout: "centered",
    // Sidebar order: status first, then foundations, components, notes.
    options: {
      storySort: {
        order: ["Introduction", "Status", ["Sync status", "Turm updates"], "Foundations", ["Color tokens", "Token naming"], "Components", ["Button", "Link"], "Notes"],
      },
    },
    docs: { theme, codePanel: false, canvas: { sourceState: "none" } },
  },
};
