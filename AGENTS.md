# Trabajar en NandOS

Responde en español de España. Conserva los cambios del usuario y trabaja dentro
del alcance autorizado. Una instrucción de proyecto no amplía permisos.

## Recuperar contexto

Lee [README](README.md), el plan activo de [docs/plans](docs/plans) y el módulo
implicado. Consulta solo lo necesario del [mapa de contexto](docs/development.md):
[arquitectura](docs/architecture.md), [diseño](docs/design.md),
[ingeniería](docs/engineering.md) y [ADRs](docs/adr/README.md).
ROADMAP conserva hitos; un plan registra ejecución y recuperación; un ADR explica
una decisión duradera. No cargues el historial completo de ROADMAP por defecto.

Para tareas claras y reversibles, implementa y comprueba directamente. Para
trabajo de varias sesiones o cambios delicados, registra antes objetivo,
aceptación, pasos y recuperación. Continúa las acciones ya autorizadas sin añadir
aprobaciones de trámite. Pregunta solo por decisiones que cambien resultado o riesgo.

## Skills y revisión

Las skills del proyecto viven en `.agents/skills`. Abre su SKILL.md cuando aplique:

| Trabajo | Skill |
| --- | --- |
| Nueva aplicación, archivos o integración con el escritorio | [nandos-integrar-aplicacion](.agents/skills/nandos-integrar-aplicacion/SKILL.md) |
| Mecánicas, renderizado o nuevo juego | [nandos-desarrollar-juego](.agents/skills/nandos-desarrollar-juego/SKILL.md) |
| Cambios de interfaz, móvil o interacción | [nandos-revisar-interfaz](.agents/skills/nandos-revisar-interfaz/SKILL.md) |
| Entrega con varias comprobaciones o cambios delicados | [nandos-verificar-entrega](.agents/skills/nandos-verificar-entrega/SKILL.md) |
| Decisión duradera de arquitectura o dependencia | [nandos-registrar-decision](.agents/skills/nandos-registrar-decision/SKILL.md) |
| Aprendizaje comprobado al cerrar una tarea | [nandos-consolidar-aprendizaje](.agents/skills/nandos-consolidar-aprendizaje/SKILL.md) |

En entregas sustanciales que afecten comportamiento, arquitectura, seguridad o
controles, solicita una revisión independiente con el perfil pertinente de
`.codex/agents`. Máximo dos auxiliares simultáneos. El principal delimita objetivo,
archivos, evidencia y salida; integra y comprueba. Los revisores trabajan en
lectura y no heredan permiso para publicar. Si el cliente no permite seleccionar
el perfil, lee el TOML y pasa sus instrucciones al subagente; no afirmes que se
activó automáticamente. Si no hay delegación disponible, declara esa limitación.
La configuración de roles no constituye aislamiento del sistema operativo.

## Implementar y comprobar

- Busca componentes y lógica existentes antes de añadir dependencias. Mantén la
  estética W95 y las dimensiones de escritorio también en móvil; usa las bases compartidas.
- Separa reglas de juego, adaptación al motor y presentación. Para WebGL/WASM o
  cambios de empaquetado prueba la compilación servida, no solo el servidor de desarrollo.
- Un fallo reproducible merece una regresión útil. No cambies expectativas para
  ocultarlo. Mide rendimiento cuando sea el problema; no inventes FPS o cobertura.
- `pnpm verify` debe terminar sin avisos. `pnpm agents:check` valida este corpus;
  no demuestra que un cliente haya cargado sus perfiles ni que la UX sea correcta.
- No uses datos o servicios de producción para pruebas de escritura rutinarias.
  Conserva las restricciones de autenticación, publicaciones de wiki y RAG en espera.

## Estándar de commits y entrega

- Un commit por cambio lógico: funcionalidad, corrección o infraestructura, con sus pruebas y documentación.
- Revisa `git diff --cached`; selecciona bloques si coinciden entidades distintas. Conserva cambios ajenos.
- Usa prefijos descriptivos `feat:`, `fix:`, `ci:` o `docs:`. Cada commit deja un estado coherente.
- Integra mediante PR con **Verify monorepo** aprobado; usa rebase para conservar commits separados.
- Push, merge y despliegue se hacen cuando estén autorizados. Comprueba el SHA y
  la versión publicada; un despliegue READY no acredita el recorrido funcional.
- Cierra con resultado, evidencia, límites y punto de continuación. Revisa si hay
  aprendizaje reutilizable y actualiza su fuente; si no lo hay, no inventes reglas.

## Limpieza de ramas de Neon

Tras integrar una PR, revisa su rama `preview/…` de Neon. El propietario prefiere
eliminar las obsoletas para liberar el límite. Comprueba PR integrada, uso exclusivo
de vista previa y ausencia de trabajo pendiente. Conserva `main`, `development`
y ramas de PR abiertas; las PR de GitHub quedan como historial. Esta preferencia
no sustituye confirmaciones obligatorias de borrado definitivo. Verifica las
ramas restantes y el aviso de límite tras la limpieza.
