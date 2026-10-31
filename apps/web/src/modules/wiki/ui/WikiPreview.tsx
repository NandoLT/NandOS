import { useState } from 'react'
import styled from '@emotion/styled'
import { createPreviewWikiRepository } from '../infrastructure/preview-repository'
import { WikiPanel } from './WikiPanel'

const Screen = styled.main`
  height: 100dvh; min-height: 0; overflow-y: auto; scrollbar-gutter: stable;
  padding: clamp(10px, 3vw, 34px);
  background-color: var(--os-desktop); background-image: var(--os-desktop-pattern);
  color: var(--os-window-text); font-family: var(--os-font-family);
`
const Window = styled.div`
  max-width: 1440px; margin: auto; border: var(--os-window-border); box-shadow: var(--os-window-shadow);
  background: var(--os-window);
  > header { padding: 8px 12px; color: var(--os-titlebar-text); background: var(--os-titlebar); font-size: 13px; font-weight: 700; }
  > p { margin: 16px 18px 0; padding: 12px; border: 1px solid var(--os-border); background: var(--os-surface-alt); font-size: 12px; line-height: 1.5; }
  > section { padding: 18px; }
`

export default function WikiPreview() {
  const [repository] = useState(() => {
    const local = createPreviewWikiRepository()
    void local.seed()
    return local
  })
  return <Screen><Window>
    <header>📚 NandOS · Laboratorio local de la wiki</header>
    <p><strong>Vista de pruebas local · sin conexión a Neon.</strong> Puedes editar, guardar, publicar y retirar artículos para validar el flujo. Todo vive en memoria y se reinicia al recargar; no modifica el portfolio ni el asistente publicados. <a href="/">Volver a NandOS</a></p>
    <WikiPanel repository={repository} />
  </Window></Screen>
}
