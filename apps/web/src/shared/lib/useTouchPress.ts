import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export function useTouchPress() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const origin = useRef({ x: 0, y: 0 })
  const pointerType = useRef('mouse')
  const held = useRef(false)

  const cancel = () => {
    clearTimeout(timer.current)
    timer.current = undefined
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return {
    start: (event: ReactPointerEvent, onHold: () => void) => {
      cancel()
      pointerType.current = event.pointerType
      held.current = false
      origin.current = { x: event.clientX, y: event.clientY }
      if (event.pointerType !== 'touch' || event.button !== 0) return
      timer.current = setTimeout(() => {
        held.current = true
        onHold()
      }, 500)
    },
    move: (event: ReactPointerEvent) => {
      if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) >= 5) cancel()
    },
    cancel,
    isTouch: () => pointerType.current === 'touch',
    consumeHold: () => {
      const value = held.current
      held.current = false
      return value
    },
  }
}
