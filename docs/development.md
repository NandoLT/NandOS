# Contexto y agentes del proyecto

## Dónde está cada cosa

| Necesidad | Fuente que mantener |
| --- | --- |
| Arranque, comandos y conexión local | [README](../README.md) y [API](../apps/api/README.md) |
| Límites, persistencia, servicios y código | [Arquitectura](architecture.md) |
| Identidad y recorrido del escritorio | [Diseño](design.md) |
| Controles y evidencia de entrega | [Ingeniería](engineering.md) |
| Motivo y alternativas de una decisión | [ADRs](adr/README.md) |
| Trabajo actual y recuperación | [Planes](plans) |
| Hitos y propuestas futuras | [ROADMAP](../ROADMAP.md) |
| Mecánicas y referencias de juegos | [Juegos](games/README.md) |
| Origen y selección de instrucciones externas | [Fuentes](sources.md) |

Abre la carpeta del repositorio o su worktree como proyecto. Las skills se guardan
una sola vez en `.agents/skills`; los perfiles Codex en `.codex/agents` y el límite
de dos auxiliares en `.codex/config.toml`. No se fija modelo, proveedor, permiso,
confianza, MCP ni automatización global. El cliente necesita admitir y cargar
la configuración del proyecto; una sesión ya abierta puede requerir otro turno
o una nueva sesión para descubrir skills añadidas. No se afirma su carga por el
mero hecho de que los ficheros existan.

## Revisores

- `nandos-quality-reviewer`: contratos, estados, persistencia, regresiones y pruebas.
- `nandos-security-reviewer`: autenticación, fronteras de confianza, importación y datos.
- `nandos-ux-reviewer`: identidad W95, teclado, foco, móvil y continuidad de tareas.
- `nandos-gameplay-reviewer`: reglas, controles, física, recursos y rendimiento de juegos.

Selecciona el perfil por nombre si el cliente lo permite. Si la herramienta de
delegación no expone esa selección, incluye las instrucciones de su TOML en el
encargo y declara la adaptación. El encargo delimita entradas, archivos y preguntas;
no adelanta la conclusión que el revisor debe alcanzar. Salida: hallazgo, ubicación,
reproducción, efecto y prioridad; también alcance y comprobaciones no realizadas.
Sin hallazgos significa que no se detectaron dentro de ese alcance, no una garantía.
Los revisores no editan ni despliegan por instrucción. Heredan permisos efectivos
del principal; el TOML no crea un entorno aislado en lectura.

## Mantenimiento

`pnpm agents:check` comprueba metadatos, enlaces internos y configuración acotada.
`pnpm agents:test` prueba fallos del validador. Ambos están en `pnpm verify` y el
pre-commit comprueba el corpus preparado en cada commit.
Requieren Python 3.11 o superior, sin paquetes Python externos; Ubuntu de CI ya
lo incorpora. El validador admite el subconjunto de metadatos usado por estas skills propias
(name/description y tres campos UI); no es un linter de cualquier YAML externo.
La salida estática no comprueba descubrimiento ni conducta del LLM. La CLI instalada
aceptó el arranque con configuración estricta el 23/11/2026; no acredita que esta
sesión haya cargado los perfiles añadidos.
[Los escenarios](../scripts/agents/scenarios.json) se evalúan con un revisor real
al cambiar sustancialmente instrucciones; no se asignan puntuaciones ficticias.

Las instrucciones son redacción propia. No se instalan paquetes, observadores de
conversación, hooks de Claude ni actualizaciones automáticas de fuentes externas.
Consulta fechas y commits en fuentes antes de revalidar una dependencia. Si falla
un control, corrige o declara el fallo; no uses `--no-verify` ni retires el control
para integrar. CI verifica también aunque el hook local no esté instalado.
