# Controles y evidencia

## Controles ejecutables

| Control | Qué demuestra | Límite |
| --- | --- | --- |
| Pre-commit | Diff preparado válido, lint JS/TS preparado y corpus de agentes preparado | Requiere `pnpm hooks:install` en cada clon; no sustituye CI |
| `pnpm agents:check` | Estructura, enlaces, metadatos y configuración del corpus propio | No mide decisiones del agente ni asegura carga del cliente |
| `pnpm agents:test` | Rechazo de corpus inválido y lectura del índice preparado | No evalúa un modelo |
| `pnpm verify` | Controles de agentes, lint sin avisos, tipos, compilación y tests del monorepo | No ejecuta navegador ni escribe en Neon |
| GitHub **Verify monorepo** | El commit remoto pasa la misma comprobación con lockfile congelado | No prueba el despliegue funcional |
| Prueba del artefacto servido | Carga diferida, WASM/WebGL, interacción y errores en la compilación final | Registrar navegador, versión y recorrido; no extrapolar a todos los dispositivos |

El hook nunca prepara archivos ajenos ni reconstruye el índice del usuario. El
validador `--staged` lee los blobs del índice, no la copia de trabajo; el hook
ejecuta también el propio validador extraído del índice, en un archivo temporal. Para un
diagnóstico puede ejecutarse `python3 scripts/agents/check.py --staged` directamente.

## Elegir comprobaciones

Un cambio pequeño y reversible necesita una comprobación enfocada. Un cambio de
reglas tiene tests de resultados y casos límite, no snapshots que copien la
implementación. En juegos usa azar inyectable o semilla para reproducir un fallo,
sin fijar la partida del usuario. Un cambio sensible de seguridad revisa rutas,
origen, sesión, logs y fallo seguro en pruebas aisladas. No imprimir secretos.

Para una entrega de código usa `pnpm verify`. Cambios de Three.js, Rapier, Vite,
chunks o carga diferida requieren abrir `pnpm --filter @nandoos/web preview --host
127.0.0.1 --port 4180 --strictPort` después de compilar: probar arranque y una
acción del juego, consola y peticiones fallidas. El fallo de Pinball del 22/11/2026
pasó build y tests; solo se reprodujo con los chunks compilados.

Para rendimiento recoge versión, dispositivo, viewport, escena y medida antes y
después. No introducir presupuestos universales de FPS o cobertura sin una base.
Los avisos nuevos se corrigen; no se silencian ni se amplían límites para ocultarlos.

## Entrega y seguimiento

Registra comando, resultado, versión y comprobaciones omitidas en el plan; no
necesitas un informe nuevo por cada detalle. Si está autorizado publicar, confirma
SHA, CI, web/API y recorrido real desde el dominio. Una vista previa fallida por
cuota de Neon se distingue de un defecto de código. Tras integrar revisa las ramas
obsoletas según AGENTS; no borres PR abiertas, producción o desarrollo.

Los escenarios de [evaluación](../scripts/agents/scenarios.json) comprueban conducta
mediante revisión independiente y su evidencia se registra en el plan. Los checks
estáticos no acreditan que estas respuestas se vayan a producir siempre.
