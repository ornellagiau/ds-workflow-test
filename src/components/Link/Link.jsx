import "./Link.css";

/**
 * Link: goes somewhere else (another page or view). For an action on the current page use Button.
 * Written from Link.contract.yaml. Hover, focus and pressed are CSS states, not props.
 *
 * @summary Text link to another page or view. Not for actions on the current page.
 */
export function Link({
  href,                        // required, non-visual (guess in the contract)
  children = "Hier einloggen", // contract: props.text
  size = "S",                  // "S" | "M"
  emphasis = "primary",        // "primary" | "secondary" | "quiet"
  leadingIcon = null,          // slot, nullable
  trailingIcon = null,         // slot, nullable
  disabled = false,            // contract: disabled (state=disabled in Figma)
  ...rest
}) {
  const className = `ds-link ds-link--${emphasis} ds-link--${size.toLowerCase()}`;
  const content = (
    <span className="ds-link__content">
      {leadingIcon && <span className="ds-link__icon" aria-hidden="true">{leadingIcon}</span>}
      <span className="ds-link__label">{children}</span>
      {trailingIcon && <span className="ds-link__icon" aria-hidden="true">{trailingIcon}</span>}
    </span>
  );
  // A disabled link has no href: it is not focusable and not followed.
  if (disabled) {
    return (
      <a className={className} role="link" aria-disabled="true" {...rest}>
        {content}
      </a>
    );
  }
  return (
    <a className={className} href={href} {...rest}>
      {content}
    </a>
  );
}
