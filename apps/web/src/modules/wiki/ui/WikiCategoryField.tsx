import { useEffect, useId, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { Button } from './wiki.styles'

const Field = styled.div`
  display: grid; align-content: start; gap: 5px; min-width: 0;
  label { font-size: 12px; font-weight: 600; }
  select { width: 100%; min-width: 0; min-height: 35px; padding: 8px 10px;
    border: var(--os-inset-border); background: var(--os-input); color: var(--os-input-text); font-size: 14px; }
  small { font-size: 11px; line-height: 1.5; color: var(--os-muted); }
`
const Row = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0;
  select, input { flex: 1 1 140px; width: 0; }
  button { flex-shrink: 0; }
`
const NewCategory = styled.div`
  display: grid; gap: 7px; padding: 10px; margin-top: 3px;
  border: 1px solid var(--os-border); background: var(--os-surface-alt);
`

export function WikiCategoryField({ value, categories, disabled, onChange }: {
  value: string
  categories: string[]
  disabled: boolean
  onChange: (category: string) => void
}) {
  const id = useId()
  const selector = useRef<HTMLSelectElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const options = [...new Set(['General', ...categories, value])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
  const trimmedName = name.trim().replace(/\s+/g, ' ')
  const canAdd = trimmedName.length > 0 && trimmedName.length <= 80 && !disabled

  useEffect(() => { if (adding) nameInput.current?.focus() }, [adding])

  function close() {
    setAdding(false)
    setName('')
    selector.current?.focus()
  }
  function add() {
    if (!canAdd) return
    const existing = options.find((option) => option.localeCompare(trimmedName, 'es', { sensitivity: 'accent' }) === 0)
    onChange(existing ?? trimmedName)
    close()
  }

  return <Field>
    <label htmlFor={`${id}-select`}>Categoría del artículo</label>
    <Row>
      <select ref={selector} id={`${id}-select`} value={value} disabled={disabled} onChange={(event) => { onChange(event.target.value); setAdding(false); setName('') }}>
        {options.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      <Button type="button" disabled={disabled} aria-expanded={adding} aria-controls={`${id}-new`} onClick={() => {
        if (adding) close()
        else setAdding(true)
      }}>Nueva categoría</Button>
    </Row>
    {adding ? <NewCategory id={`${id}-new`} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    }}>
      <label htmlFor={`${id}-name`}>Nombre de la nueva categoría</label>
      <input ref={nameInput} id={`${id}-name`} value={name} maxLength={80} disabled={disabled}
        aria-describedby={`${id}-hint`} placeholder="Ej.: Guías avanzadas" onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); add() } }} />
      <Row>
        <Button type="button" $primary disabled={!canAdd} onClick={add}>Añadir categoría</Button>
        <Button type="button" onClick={close}>Cancelar</Button>
      </Row>
      <small id={`${id}-hint`}>Máximo 80 caracteres. La categoría se conservará en la biblioteca al guardar este artículo.</small>
    </NewCategory> : null}
  </Field>
}
