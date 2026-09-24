import { Button } from "./Button";

export default {
  title: "Components/Button",
  component: Button,
  argTypes: { variant: { control: "inline-radio", options: ["primary", "secondary"] } },
};

/** The one main action in a view. Figma: "Button primary". */
export const Primary = { args: { variant: "primary", children: "Button primary" } };

/** An alternative, less important action. Figma: "Button secondary". */
export const Secondary = { args: { variant: "secondary", children: "Button secondary" } };

/** Typical pairing: one primary, one secondary. The primary comes first in reading order. */
export const Pair = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button variant="primary">Speichern</Button>
      <Button variant="secondary">Abbrechen</Button>
    </div>
  ),
};

/** Inside a form the primary button submits: type="submit". */
export const InForm = {
  render: () => (
    <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input aria-label="E-Mail" placeholder="E-Mail" style={{ padding: 8, font: "12px Inter, sans-serif" }} />
      <Button variant="primary" type="submit">Anmelden</Button>
    </form>
  ),
};
