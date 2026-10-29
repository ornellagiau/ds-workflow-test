import { Button } from "./Button";

export default {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: { description: "The one main action, or an alternative next to it.", control: "inline-radio", options: ["primary", "secondary"], table: { type: { summary: '"primary" | "secondary"' }, defaultValue: { summary: '"primary"' } } },
    children: { description: "The label.", control: "text", table: { type: { summary: "string" }, defaultValue: { summary: '"Button"' } } },
    type: { description: "Use \"submit\" for the primary button inside a form.", control: "inline-radio", options: ["button", "submit"], table: { type: { summary: '"button" | "submit"' }, defaultValue: { summary: '"button"' } } },
    onClick: { description: "Click handler.", control: false, table: { type: { summary: "function" } } },
  },
};

/** The one main action in a view. Figma: Button, Variant=Primary. */
export const Primary = { args: { variant: "primary", children: "Button primary" } };

/** An alternative, less important action. Figma: Button, Variant=Secondary. */
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
