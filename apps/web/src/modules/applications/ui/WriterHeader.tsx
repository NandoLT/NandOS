import { useState } from 'react'
import styled from '@emotion/styled'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'

const Header = styled.header`
  position: relative;
  z-index: 2;
  background: var(--os-toolbar);
  border-bottom: var(--os-raised-border);
  button, select {
    color: var(--os-window-text);
    font: inherit;
    cursor: pointer;
  }
  button:disabled { opacity: .45; cursor: default; }
  button:focus-visible, select:focus-visible { outline: 1px dotted var(--os-accent); outline-offset: -3px; }
`

const MenuBar = styled.nav`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding-inline: 4px;
  border-bottom: var(--os-raised-border);
  > div > button {
    background: transparent;
    border: 0;
    padding: 3px 7px;
  }
  > div > button:hover, > div > button[aria-expanded='true'] {
    color: var(--os-menu-hover-text);
    background: var(--os-menu-hover);
  }
`

const Menu = styled.div`
  position: absolute;
  z-index: 1;
  display: grid;
  min-width: 130px;
  padding: 2px;
  border: var(--os-raised-border);
  background: var(--os-window);
  box-shadow: 2px 2px 0 #0005;
  button {
    text-align: left;
    border: 0;
    background: transparent;
    padding: 4px 10px;
  }
  button:hover:not(:disabled), button:focus-visible {
    background: var(--os-menu-hover);
    color: var(--os-menu-hover-text);
  }
`

const FileName = styled.span`
  margin-inline-start: auto;
  padding-inline: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: bold;
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px 5px;
  border-bottom: var(--os-raised-border);
  > div { display: inline-flex; gap: 2px; }
  > div + div { border-inline-start: var(--os-inset-border); padding-inline-start: 4px; }
  button {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 25px;
    padding: 0;
    border: var(--os-raised-border);
    background: var(--os-window);
    font: 15px 'Times New Roman', serif;
  }
  button:not(:disabled):active, button[aria-pressed='true'] { border: var(--os-inset-border); }
  select {
    width: 112px;
    height: 25px;
    border: var(--os-inset-border);
    background: var(--os-input);
    color: var(--os-input-text);
  }
`

const icons = {
  new: <><path d="M3 1h7l3 3v11H3Z" fill="white" /><path d="M10 1v4h3M5 8h6M5 11h6" /></>,
  open: <><path d="M1 4h6l2 2h5v7H1Z" fill="#d3a442" /><path d="M4 7h11l-3 6H1Z" fill="#fff08a" /></>,
  save: <><path d="M2 1h11l2 2v12H2Z" fill="#838fa2" /><path d="M5 1h6v5H5ZM4 9h9v6H4Z" fill="white" /><path d="M9 2v3" /></>,
  undo: <path d="M5 4 1 8l4 4M1 8h8c4 0 5 2 5 5" fill="none" />,
  redo: <path d="m11 4 4 4-4 4m4-4H7c-4 0-5 2-5 5" fill="none" />,
  bullets: <><path d="M6 4h9M6 8h9m-9 4h9" /><path d="M2 4h1m-1 4h1m-1 4h1" strokeWidth="2" /></>,
  numbered: <><path d="M7 4h8M7 8h8m-8 4h8" /><text x="0" y="14" fontSize="14" stroke="none" fill="currentColor">1</text></>,
}

type Command = { label: string; run: () => void; disabled?: boolean; pressed?: boolean }

export function WriterHeader({ editor, name, dirty, onNew, onOpen, onSave, onSaveAs }: {
  editor: Editor | null
  name: string
  dirty: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const state = useEditorState({ editor, selector: ({ editor }) => {
    if (!editor) return null
    return {
      heading: [1, 2, 3, 4, 5, 6].find((level) => editor.isActive('heading', { level })) ?? 0,
      bold: editor.isActive('bold'), italic: editor.isActive('italic'), strike: editor.isActive('strike'),
      bullets: editor.isActive('bulletList'), numbered: editor.isActive('orderedList'),
      quote: editor.isActive('blockquote'), canUndo: editor.can().undo(), canRedo: editor.can().redo(),
    }
  } })
  const fileNew = { label: 'Nuevo', run: onNew }
  const fileOpen = { label: 'Abrir…', run: onOpen }
  const save = { label: 'Guardar', run: onSave, disabled: !editor }
  const undo = { label: 'Deshacer', run: () => editor?.chain().focus().undo().run(), disabled: !state?.canUndo }
  const redo = { label: 'Rehacer', run: () => editor?.chain().focus().redo().run(), disabled: !state?.canRedo }
  const bold = { label: 'Negrita', run: () => editor?.chain().focus().toggleBold().run(), pressed: state?.bold }
  const italic = { label: 'Cursiva', run: () => editor?.chain().focus().toggleItalic().run(), pressed: state?.italic }
  const strike = { label: 'Tachado', run: () => editor?.chain().focus().toggleStrike().run(), pressed: state?.strike }
  const bullets = { label: 'Viñetas', run: () => editor?.chain().focus().toggleBulletList().run(), pressed: state?.bullets }
  const numbered = { label: 'Lista numerada', run: () => editor?.chain().focus().toggleOrderedList().run(), pressed: state?.numbered }
  const quote = { label: 'Cita', run: () => editor?.chain().focus().toggleBlockquote().run(), pressed: state?.quote }
  const rule = { label: 'Línea horizontal', run: () => editor?.chain().focus().setHorizontalRule().run(), disabled: !editor }
  const menus: { name: string; commands: Command[] }[] = [
    { name: 'Archivo', commands: [fileNew, fileOpen, save, { label: 'Guardar como…', run: onSaveAs }] },
    { name: 'Edición', commands: [undo, redo] },
    { name: 'Insertar', commands: [rule] },
    { name: 'Formato', commands: [bold, italic, strike, bullets, numbered, quote] },
  ]
  const tool = ({ label, run, disabled, pressed }: Command, symbol: React.ReactNode) =>
    <button type="button" aria-label={label} title={label} disabled={disabled} aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()} onClick={run}>{symbol}</button>
  const icon = (name: keyof typeof icons) =>
    <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" aria-hidden="true">{icons[name]}</svg>

  return <Header>
    <MenuBar aria-label="Menús de Writer"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null) }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !openMenu) return
        event.stopPropagation()
        event.currentTarget.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
        setOpenMenu(null)
      }}>
      {menus.map(({ name, commands }) => <div key={name}>
        <button type="button" aria-expanded={openMenu === name} onClick={() => setOpenMenu(openMenu === name ? null : name)}>{name}</button>
        {openMenu === name && <Menu role="group" aria-label={'Opciones de ' + name}>
          {commands.map(({ label, run, disabled, pressed }) => <button key={label} type="button" disabled={disabled}
            aria-pressed={pressed} onClick={(event) => {
              event.currentTarget.closest('nav')?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
              setOpenMenu(null)
              run()
            }}>{label}</button>)}
        </Menu>}
      </div>)}
      <FileName title={name}>{name}{dirty && ' *'}</FileName>
    </MenuBar>
    <Row role="group" aria-label="Herramientas de archivo y edición">
      <div>{tool(fileNew, icon('new'))}{tool(fileOpen, icon('open'))}{tool(save, icon('save'))}</div>
      <div>{tool(undo, icon('undo'))}{tool(redo, icon('redo'))}</div>
    </Row>
    <Row role="group" aria-label="Herramientas de formato">
      <select aria-label="Estilo de párrafo" value={state?.heading ?? 0} disabled={!editor} onChange={(event) => {
        const level = Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6
        if (level) editor?.chain().focus().setHeading({ level }).run()
        else editor?.chain().focus().setParagraph().run()
      }}>
        <option value={0}>Normal</option>
        {[1, 2, 3, 4, 5, 6].map((level) => <option value={level} key={level}>Título {level}</option>)}
      </select>
      <div>{tool(bold, <b>N</b>)}{tool(italic, <i>C</i>)}{tool(strike, <s>T</s>)}</div>
      <div>{tool(bullets, icon('bullets'))}{tool(numbered, icon('numbered'))}{tool(quote, '❝')}{tool(rule, '―')}</div>
    </Row>
  </Header>
}
