import "./Button.css";

/**
 * Button for actions on the current page.
 * `primary` = the one main action in a view. `secondary` = an alternative action next to it.
 *
 * @summary Action on the current page. Max. one primary per view. Not for navigation.
 */
export function Button({ variant = "primary", children = "Button", type = "button", onClick }) {
  return (
    <button className={`ds-button ds-button--${variant}`} type={type} onClick={onClick}>
      {children}
    </button>
  );
}
