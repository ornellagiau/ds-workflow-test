import "./Link.tokens.css";
import { Link } from "./Link";

export default {
  title: "Components/Link",
  component: Link,
  argTypes: {
    href: { description: "Where the link goes. Required, except when disabled.", control: "text", table: { type: { summary: "string" } } },
    children: { description: "The link text.", control: "text", table: { type: { summary: "string" }, defaultValue: { summary: '"Hier einloggen"' } } },
    size: { description: "Text size.", control: "inline-radio", options: ["S", "M"], table: { type: { summary: '"S" | "M"' }, defaultValue: { summary: '"S"' } } },
    emphasis: { description: "How strong the underline is.", control: "inline-radio", options: ["primary", "secondary", "quiet"], table: { type: { summary: '"primary" | "secondary" | "quiet"' }, defaultValue: { summary: '"primary"' } } },
    disabled: { description: "Not clickable, not focusable, no href.", control: "boolean", table: { type: { summary: "boolean" }, defaultValue: { summary: "false" } } },
    leadingIcon: { description: "Optional icon before the text. A text placeholder for now, there is no Icon component yet.", control: false, table: { type: { summary: "node" } } },
    trailingIcon: { description: "Optional icon after the text. A text placeholder for now, there is no Icon component yet.", control: false, table: { type: { summary: "node" } } },
  },
};

/** Default link with an accent underline. Figma: Link, Emphasis=Primary. */
export const Primary = { args: { href: "#", children: "Hier einloggen", size: "S", emphasis: "primary" } };

/** Dark underline. Figma: Link, Emphasis=Secondary. */
export const Secondary = { args: { href: "#", children: "Hier einloggen", size: "S", emphasis: "secondary" } };

/** Underline only on hover. Only for link lists (footer, navigation). Figma: Link, Emphasis=Quiet. */
export const Quiet = { args: { href: "#", children: "Hier einloggen", size: "S", emphasis: "quiet" } };

/** Two sizes. Figma: Link, Size=S and Size=M. */
export const Sizes = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
      <Link href="#" size="S">Klein (S)</Link>
      <Link href="#" size="M">Mittel (M)</Link>
    </div>
  ),
};

/** Optional leading and trailing icon. The icons here are text placeholders, there is no Icon component yet. */
export const WithIcons = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
      <Link href="#" leadingIcon="←">Zurück</Link>
      <Link href="#" trailingIcon="→">Alle Top-Artikel</Link>
    </div>
  ),
};

/** Disabled: no href, not focusable, not followed. Figma: Link, State=Disabled. */
export const Disabled = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
      <Link href="#" disabled>Primary</Link>
      <Link href="#" emphasis="secondary" disabled>Secondary</Link>
      <Link href="#" emphasis="quiet" disabled>Quiet</Link>
    </div>
  ),
};

/** Quiet is for link lists such as a footer. */
export const QuietInLinkList = {
  render: () => (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {["Impressum", "Datenschutz", "Kontakt"].map((t) => (
        <li key={t}><Link href="#" emphasis="quiet">{t}</Link></li>
      ))}
    </ul>
  ),
};

/** Dark mode: the same component with the dark token values. */
export const Dark = {
  render: () => (
    <div data-theme="dark" style={{ background: "#1B1C26", padding: 24, display: "flex", gap: 24, alignItems: "baseline" }}>
      <Link href="#">Primary</Link>
      <Link href="#" emphasis="secondary">Secondary</Link>
      <Link href="#" emphasis="quiet">Quiet</Link>
      <Link href="#" disabled>Disabled</Link>
    </div>
  ),
};
