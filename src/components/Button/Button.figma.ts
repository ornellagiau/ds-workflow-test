// Code Connect template: Figma component set "Button" -> code Button.
// Figma properties -> code props: Variant -> variant, Label -> children.
// url=https://www.figma.com/design/Qg7XFgQigOnQuD40ATSl9O/DS-Workflow-test?node-id=39-4
// source=src/components/Button/Button.jsx
// component=Button
import figma from 'figma'
const instance = figma.selectedInstance

const variant = instance.getEnum('Variant', {
  Primary: 'primary',
  Secondary: 'secondary',
})
const label = instance.getString('Label')

export default {
  example: figma.code`<Button variant="${variant}">${label}</Button>`,
  imports: ['import { Button } from "./components/Button/Button"'],
  id: 'button',
  metadata: { nestable: true }
}
