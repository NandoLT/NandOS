import styled from '@emotion/styled'

const Study = styled.article`
  display: grid;
  gap: 12px;
  section {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: var(--os-raised-border);
    background: var(--os-surface);
  }
  h3, h4 { margin: 0; }
  h4 { margin-top: 4px; }
  code { overflow-wrap: anywhere; color: var(--os-window-text); }
  button {
    justify-self: start;
    padding: 6px 10px;
    border: var(--os-raised-border);
    color: var(--os-window-text);
    background: var(--os-window);
    cursor: pointer;
  }
  a { color: var(--os-accent); }
`

export const WRITER_DEMO_MARKDOWN = '# Una nota en NandOS\n\nEscribe directamente sobre la hoja y prueba **negrita** o *cursiva*.\n\n- Cambia el estilo de un párrafo.\n- Guarda la nota y vuelve a abrirla desde el Explorador.'

export function NandosProjectCase({ onOpenTerminal, onOpenWriter }: {
  onOpenTerminal: () => void
  onOpenWriter: () => void
}) {
  return <Study aria-labelledby="nandos-case-title">
    <header>
      <p>Proyecto personal · Portfolio interactivo</p>
      <h2 id="nandos-case-title">NandOS</h2>
      <p>Un portfolio que se explora como un escritorio retro. Reúne mi experiencia, proyectos y CV y permite probar cómo funcionan sus aplicaciones.</p>
    </header>
    <section>
      <h3>El reto</h3>
      <p>Dar una entrada rápida a la información profesional y, al mismo tiempo, ofrecer una demo que merezca la pena explorar.</p>
    </section>
    <section>
      <h3>Dos decisiones que puedes probar</h3>
      <h4>Un único sistema de archivos virtual</h4>
      <p>Terminal, Explorador y Writer leen los mismos archivos y carpetas. Lo que creas queda guardado en este navegador.</p>
      <p>En la Terminal, ejecuta <code>mkdir "Demo NandOS"</code> y después <code>open .</code> para ver la carpeta en el Explorador. Si ya existe, usa otro nombre.</p>
      <button type="button" onClick={onOpenTerminal}>Probar en Terminal</button>
      <h4>Edición visual con Markdown como formato de guardado</h4>
      <p>En Writer trabajas sobre la hoja formateada. Guarda la nota de ejemplo, ábrela de nuevo y comprueba que el formato se conserva. Desde la Terminal, <code>type</code> permite leer el formato guardado.</p>
      <button type="button" onClick={onOpenWriter}>Probar en Writer</button>
    </section>
    <section>
      <h3>Qué hay detrás</h3>
      <p>React y Zustand gestionan el escritorio. El contenido público del portfolio y de la wiki se administra por separado mediante Fastify y Neon.</p>
      <a href="https://github.com/NandoLT/NandOS" target="_blank" rel="noreferrer">Ver código de NandOS en GitHub</a>
    </section>
  </Study>
}
