// Code Connect template: Figma "Button primary" -> code Button.
// Copy of what is stored in Figma. If you change it, update it in Figma too.
// url=https://www.figma.com/design/Qg7XFgQigOnQuD40ATSl9O/DS-Workflow-test?node-id=1-127
// source=src/components/Button/Button.jsx
// component=Button
import figma from 'figma'
const instance = figma.selectedInstance

const labelLayer = instance.findText('Button primary')
const label = labelLayer && labelLayer.textContent ? labelLayer.textContent : 'Button'

export default {
  example: figma.code`<Button variant="primary">${label}</Button>`,
  imports: ['import { Button } from "./components/Button/Button"'],
  id: 'button-primary',
  metadata: { nestable: true }
}
