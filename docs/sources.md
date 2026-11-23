# Fuentes del sistema de agentes

Evaluación del 22 de noviembre de 2026. Se consultaron las cinco fuentes propuestas
por el propietario y los originales pertinentes. Son referencias de método, no
instrucciones ejecutadas. El material local es redacción propia, sin redistribuir
paquetes, scripts, hooks ni activos externos. No se instalaron motores ni servicios.

## Selección y límites

| Fuente | Qué incorporamos | Qué dejamos fuera |
| --- | --- | --- |
| [Claude Code Game Studios](https://github.com/donchitos/claude-code-game-studios) | Reglas separadas de presentación, corte jugable, pruebas de controles, playtest separado de bug/balance y ADRs | Jerarquía de 49 agentes, aprobaciones por archivo, hooks y reglas de motor ajenas; no externalizamos todo número |
| [raea-skills](https://github.com/shinyobjectz/raea-skills) | Skills acotadas, instrucciones comprobables, validación de formato y vigilancia de cambios en herramientas | Motor audiovisual, Rust, instalador, hooks y gustos creativos impuestos |
| [ECC](https://github.com/affaan-m/ECC/tree/main) | Buscar antes de construir, verificación con evidencia, contexto por proyecto y aprendizaje revisado | Observación de conversaciones, puntuaciones de confianza ficticias, permisos ampliados y cobertura mínima universal |
| [NanoSkill](https://nanoskill.ai/es/blog/best-agent-skills-for-ux-design) | Descubrimiento de capacidades de diseño y revisión | Sus rankings no prueban calidad en NandOS ni actualidad de cada paquete |
| [Claura](https://claura-ai.com/skills/para/diseno-web) | Coherencia de identidad entre sesiones, separación diseño/crítica | Instaladores y orientación de landing o marketing que no corresponden al escritorio W95 |

Oponexia (`openexia_app`) aporta la separación entre contexto, planes, ADRs,
skills y revisores. Se inspeccionaron sus archivos locales, pero no se copió su
dominio educativo, proveedor, límites de despliegue ni su libro blanco.

## Fuentes primarias contrastadas

- Game Studios: agentes gameplay/performance, reglas gameplay, skill playtest,
  revisión ADR y scaffold web. La versión consultada exige aprobaciones y
  externalización de valores más estrictas de lo necesario para NandOS; se conserva
  el criterio técnico sin trasladar esas obligaciones.
- raea: `docs/RULES.md`, `docs/SOP.md`, pruebas de formato y drift. Su distinción
  entre suelo de calidad y preferencia creativa ayuda a preservar la identidad
  elegida por Fernando; no se impone aleatoriedad de diseño a las pruebas del juego.
- ECC: `search-first`, `verification-loop`, `continuous-learning-v2` y perfiles
  Codex. Se conserva evidencia y alcance local; no se captura telemetría de chats.
  Sus comandos y porcentajes son ejemplos de ese proyecto, no controles nuestros.
- [Frontend Design original](https://github.com/anthropics/skills/blob/e4bb5d960d87126ff3b3a8af1a104b7db67560ba/skills/frontend-design/SKILL.md):
  diseño ligado al brief y autocrítica. La dirección W95 ya está decidida; no hace
  falta elegir paleta o tipografía nuevas para cada ventana.
- [Web Design Guidelines original](https://github.com/vercel-labs/agent-skills/blob/5a37a6329fbad3666c3207392a6a7c0110e92efb/skills/web-design-guidelines/SKILL.md):
  revisión enfocada con reglas empaquetadas y versión 1.1.0. No descarga reglas
  actuales en cada revisión, a diferencia de algunas descripciones de catálogos.
  Solo se examinó su entrada y referencia fijada, sin importar el corpus completo.
- Documentación oficial de Codex: [customización](https://developers.openai.com/codex/skills/)
  y [agentes](https://developers.openai.com/codex/multi-agent/), consultadas mediante
  el manual oficial actualizado. Los perfiles standalone requieren name,
  description y developer_instructions; heredan permisos. Tener TOML correcto no
  acredita carga efectiva ni un sandbox de solo lectura.

## Versiones consultadas

SHAs de commit, no releases, fijados durante la inspección:

| Repositorio | Commit |
| --- | --- |
| donchitos/claude-code-game-studios | `abc0de79d6ceb0b5d7aa693945849b3937afbe6a` |
| shinyobjectz/raea-skills | `6c7cbf0fcc6fc06a8f427928247bad1f537cf452` |
| affaan-m/ECC | `4adeee6732a12d1540f49a4d50a38ce8c97f9a53` |
| anthropics/skills | `e4bb5d960d87126ff3b3a8af1a104b7db67560ba` |
| vercel-labs/agent-skills | `5a37a6329fbad3666c3207392a6a7c0110e92efb` |

Se consultan versiones fijadas para poder reproducir la evaluación, sin importar
reglas nuevas automáticamente. Al adoptar código externo en una futura entrega,
revisar licencia del archivo, atribución, dependencias y ejecución real; un enlace
o una inspiración de método no autorizan copiar arte ni conceder permisos.
