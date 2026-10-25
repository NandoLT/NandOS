import styled from '@emotion/styled'

const Intro = styled.div`
  display: grid;
  gap: 18px;

  h1 {
    margin: 14px 0 10px;
    font-size: clamp(24px, 5vw, 38px);
    line-height: 1.05;
  }

  p {
    line-height: 1.45;
  }
`

const Badge = styled.div`
  display: inline-flex;
  width: fit-content;
  padding: 4px 8px;
  color: var(--os-accent-text);
  background: var(--os-accent);
  font-size: 12px;
`

const Facts = styled.dl`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 16px;
  margin: 0;
  padding: 12px;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  background: var(--os-surface-alt);
  overflow-wrap: anywhere;

  dt {
    font-weight: 700;
  }

  dd {
    margin: 0;
  }
`

export function AboutWindow() {
  return (
    <Intro>
      <div>
        <Badge>PERSONAL PORTFOLIO OS</Badge>
        <h1>Fernando López Trejo</h1>
        <p>
          Bienvenido a NandOS. Desde este escritorio puedes explorar mi experiencia,
          proyectos, habilidades y descargar el CV.
        </p>
      </div>

      <Facts>
        <dt>Estado</dt>
        <dd>Explorando nuevas oportunidades</dd>
        <dt>Interfaz</dt>
        <dd>React · TypeScript · Product thinking</dd>
        <dt>Especialidad</dt>
        <dd>Interfaces y producto con React y TypeScript</dd>
      </Facts>
    </Intro>
  )
}
