import "../src/tokens.css";
import "./docs.css";
import theme from "./theme";

export default {
  parameters: {
    layout: "centered",
    docs: { theme, codePanel: false, canvas: { sourceState: "none" } },
  },
};
