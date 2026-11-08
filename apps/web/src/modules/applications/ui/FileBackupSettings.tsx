import { useState } from 'react'
import styled from '@emotion/styled'
import { useShellStore } from '../../shell/application/shell.store'
import { exportFileBackup, MAX_BACKUP_BYTES, parseFileBackup } from '../domain/file-backup'
import type { FileBackup } from '../domain/file-backup'

const Panel = styled.div`
  display: grid;
  gap: 12px;
  section {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: var(--os-inset-border);
  }
  h3, p, ul { margin: 0; }
  input { max-width: 100%; min-width: 0; }
  label, h3 { font-weight: bold; }
  ul { padding-inline-start: 22px; overflow-wrap: anywhere; }
  button {
    justify-self: start;
    padding: 6px 10px;
    border: var(--os-raised-border);
    color: var(--os-window-text);
    background: var(--os-window);
    cursor: pointer;
  }
  button:focus-visible { outline: 2px dotted var(--os-accent); }
  [role='alert'] { color: var(--os-danger); }
`

export function FileBackupSettings() {
  const [preview, setPreview] = useState<FileBackup | null>(null)
  const [reading, setReading] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null)

  const reportError = (reason: unknown, fallback: string) =>
    setFeedback({ text: reason instanceof Error ? reason.message : fallback, error: true })

  const download = () => {
    setFeedback(null)
    try {
      const { userDesktopItems, fileNodes } = useShellStore.getState()
      const json = exportFileBackup(userDesktopItems, fileNodes)
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'nandos-archivos.json'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setFeedback({ text: 'Copia preparada para descargar.' })
    } catch (reason) {
      reportError(reason, 'No se pudo exportar la copia.')
    }
  }

  const read = async (file: File) => {
    setPreview(null)
    setFeedback(null)
    setReading(true)
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('La copia supera el límite de 2 MB.')
      const backup = parseFileBackup(await file.text())
      if (!backup.entries.length) throw new Error('La copia está vacía.')
      setPreview(backup)
    } catch (reason) {
      reportError(reason, 'No se pudo leer la copia.')
    } finally {
      setReading(false)
    }
  }

  const restore = (backup: FileBackup) => {
    try {
      const folder = useShellStore.getState().importFileBackup(backup)
      setPreview(null)
      setFeedback({ text: 'Archivos importados en Mis documentos › ' + folder + '.' })
    } catch (reason) {
      reportError(reason, 'No se pudo importar la copia.')
    }
  }

  const documents = preview?.entries.filter(({ kind }) => kind === 'document').length ?? 0
  return <Panel>
    <h2>Copia de archivos</h2>
    <p>Guarda tus carpetas y documentos de Writer en un archivo JSON para llevarlos a otro navegador.</p>
    <section aria-label="Exportar archivos">
      <p>La copia contiene solo los archivos activos que has creado. Excluye la Papelera, las preferencias y los archivos del sistema.</p>
      <button type="button" onClick={download}>Exportar mis archivos</button>
    </section>
    <section aria-label="Importar archivos">
      <label htmlFor="nandos-file-backup">Seleccionar copia de NandOS</label>
      <input id="nandos-file-backup" type="file" accept=".json,application/json" disabled={reading} onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void read(file)
      }} />
      {reading && <p role="status">Leyendo la copia…</p>}
      {preview && <>
        <h3>Vista previa de la importación</h3>
        <p>{documents} {documents === 1 ? 'documento' : 'documentos'} · {preview.entries.length - documents} {preview.entries.length - documents === 1 ? 'carpeta' : 'carpetas'}</p>
        <ul aria-label="Contenido de la copia">
          {preview.entries.slice(0, 8).map(({ kind, name }, index) => <li key={index}>{kind === 'folder' ? '📁 ' : '📄 '}{name}</li>)}
        </ul>
        {preview.entries.length > 8 && <p>Y {preview.entries.length - 8} elementos más.</p>}
        <p>Se importará en una carpeta nueva dentro de Mis documentos, sin sustituir los archivos que ya tienes.</p>
        <button type="button" onClick={() => restore(preview)}>Importar copia</button>
        <button type="button" onClick={() => { setPreview(null); setFeedback(null) }}>Cancelar importación</button>
      </>}
    </section>
    {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
  </Panel>
}
