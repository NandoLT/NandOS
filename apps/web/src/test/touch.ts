import { fireEvent } from '@testing-library/react'

export function touchPointer(target: Element, type: 'pointerdown' | 'pointerup' | 'pointermove', x = 40, y = 40) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y })
  Object.defineProperties(event, {
    pointerType: { value: 'touch' }, pointerId: { value: 1 }, isPrimary: { value: true },
  })
  fireEvent(target, event)
}
