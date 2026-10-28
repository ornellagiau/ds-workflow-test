// Code Connect template: Figma component set "Link" -> code Link.
// Figma properties -> code props:
//   Link Text -> children, Size -> size, Emphasis -> emphasis, State=Disabled -> disabled (the other states are CSS: hover, focus, pressed),
//   Show Leading Icon / Show Trailing Icon -> leadingIcon / trailingIcon (the icon itself is a placeholder: there is no Icon component yet).
// url=https://www.figma.com/design/Qg7XFgQigOnQuD40ATSl9O/DS-Workflow-test?node-id=85-227
// source=src/components/Link/Link.jsx
// component=Link
import figma from 'figma'
const instance = figma.selectedInstance

const size = instance.getEnum('Size', {
  S: 'S',
  M: 'M',
})
const emphasis = instance.getEnum('Emphasis', {
  Primary: 'primary',
  Secondary: 'secondary',
  Quiet: 'quiet',
})
const state = instance.getEnum('State', {
  Idle: '',
  Hover: '',
  Focus: '',
  Pressed: '',
  Disabled: ' disabled',
})
const text = instance.getString('Link Text')
const leading = instance.getBoolean('Show Leading Icon', { true: ' leadingIcon={<Icon />}', false: '' })
const trailing = instance.getBoolean('Show Trailing Icon', { true: ' trailingIcon={<Icon />}', false: '' })
// The icon swaps are read so the sync check sees them as used. The snippet shows <Icon /> as a placeholder.
instance.getInstanceSwap('Swap Leading Icon')
instance.getInstanceSwap('Swap Trailing Icon')

export default {
  example: figma.code`<Link href="#" size="${size}" emphasis="${emphasis}"${state}${leading}${trailing}>${text}</Link>`,
  imports: ['import { Link } from "./components/Link/Link"'],
  id: 'link',
  metadata: { nestable: true }
}
