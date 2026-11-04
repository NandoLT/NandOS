import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import styled from '@emotion/styled'

const Editor = styled.div`
  position: fixed;
  z-index: 1290;
  input {
    box-sizing: border-box;
    width: 100%;
    padding: 3px;
    border: var(--os-inset-border);
    border-radius: 0;
    color: var(--os-input-text);
    background: var(--os-input);
    font: inherit;
    font-size: 12px;
    text-align: center;
    user-select: text;
  }
  [role='alert'] {
    display: block;
    padding: 5px;
    color: var(--os-input-text);
    background: var(--os-input);
    border: 1px solid var(--os-danger);
    font-size: 12px;
  }
`

type Props = {
  anchorRef: RefObject<HTMLSpanElement | null>
  name: string
  onSave: (name: string) => string | null
  onClose: () => void
}

export function DesktopFolderNameEditor({ anchorRef, name, onSave, onClose }: Props) {
  const [value, setValue] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const finished = useRef(false)
  const errorId = useId()
  const positioned = position !== null

  useLayoutEffect(() => {
    const reposition = () => {
      const bounds = anchorRef.current?.getBoundingClientRect()
      if (!bounds) return
      const width = Math.min(160, window.innerWidth - 8)
      setPosition({
        left: Math.max(4, Math.min(bounds.left + bounds.width / 2 - width / 2, window.innerWidth - width - 4)),
        top: bounds.top,
        width,
      })
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!positioned) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [positioned])

  const close = (restoreFocus: boolean) => {
    finished.current = true
    onClose()
    if (restoreFocus) anchorRef.current?.closest('button')?.focus()
  }

  const save = (fromKeyboard: boolean) => {
    if (finished.current) return
    const message = onSave(value)
    if (message && fromKeyboard) {
      setError(message)
      return
    }
    close(fromKeyboard)
  }

  // A portal keeps the textbox out of the shortcut button (no nested controls).
  return createPortal(
    <Editor
      style={position ?? { visibility: 'hidden' }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        aria-label="Nombre de la carpeta"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        maxLength={80}
        value={value}
        onChange={(event) => { setValue(event.target.value); setError(null) }}
        onBlur={() => save(false)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Escape') {
            event.preventDefault()
            close(true)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            save(true)
          }
        }}
      />
      {error && <span id={errorId} role="alert">{error}</span>}
    </Editor>, document.body
  )
}
