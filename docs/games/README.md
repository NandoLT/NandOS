# Desarrollo de juegos

Empieza por un corte jugable: entrar desde el menú, entender los controles,
ejecutar la mecánica principal y reiniciar. Luego revisa reglas, sensación,
acabado y rendimiento según evidencia. No confundas una sesión del agente con
un estudio de diversión de usuarios.

| Aplicación | Código de reglas/motor | Situación |
| --- | --- | --- |
| Buscaminas | [domain/minesweeper](../../apps/web/src/modules/applications/domain/minesweeper.ts) | Implementado; PR integrada |
| Solitario | [domain/solitaire](../../apps/web/src/modules/applications/domain/solitaire.ts) | Implementado; PR integrada |
| Pinball | [ficha](pinball.md) | Prototipo jugable publicado; acabado y sistemas pendientes |

## Brief para otro juego

Registra en una ficha el objetivo, referencia estética, reglas, victoria/derrota,
estados, controles de teclado/táctil y comportamiento al perder foco/minimizar/cerrar.
Incluye motor mínimo, integración con Programas > Accesorios > Juegos, persistencia
si existe, casos límite, prueba jugable y procedencia/licencia de recursos.
La ficha de un prototipo identifica lo que aún no simula; una imagen bonita no
acredita reglas completas. Solo añadir otro motor o librería si hace falta y con ADR.

## Revisión según género

- Tableros y cartas: barajado/azar controlable en tests, movimientos legales,
  bloqueos, victoria/derrota, reinicio y registros sin mezclar partidas.
- Tiempo real: paso independiente del render, pausa/retorno de pestaña, pérdida de
  foco y entradas sostenidas, colisiones rápidas, liberación de RAF/listeners/GPU.
- 3D: contexto WebGL, carga WASM, error recuperable, build servido y resize/viewport.

Distingue defecto reproducible, ajuste de equilibrio, impresión de juego y acabado.
Mide antes de optimizar; guarda semilla/estado y pasos cuando ayuden a reproducir.
No extraer sprites, sonidos ni marcas de un juego comercial por tener una captura.
