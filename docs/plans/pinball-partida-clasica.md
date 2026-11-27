# Pinball — composición y partida clásica

Fecha: 23/11/2026. Estado: versión de revisión; acabado pendiente. Base: e4537cf.

## Objetivo y aceptación

Aproximar el prototipo al diseño, lectura y ciclo de juego de Space Cadet sin
sustituir Three/Rapier ni perder el lanzador ya validado. Iteración autorizada
para implementar y probar en local; no incluye publicar.

- Tablero más presente en su ventana, perspectiva y contraste más cercanos a la referencia.
- Elementos inferiores reconocibles: slingshots físicos y flippers con goma; bumpers con impulso y respuesta luminosa.
- Partida de tres bolas con puntuación, fin de partida y reinicio. Ensayo libre disponible como opción.
- Objetivos reproducibles vinculados al nuevo trazado y a contactos físicos.
- Teclado y táctil, pausa/pérdida de foco y carga débil conservados. Score y luces no crecen por contactos sostenidos.
- Tests de reglas y motor, compilación servida, prueba real de lanzamiento y revisión independiente. Sin avisos nuevos.

## Referencia vigente — 27/11/2026

La imagen simplificada del propietario sustituye el trazado anterior. Una sola
órbita continua desde el muelle inferior derecho hasta la salida superior
izquierda; cuatro bumpers en cuadrícula, dos bancos laterales de tres dianas,
dos slingshots, flippers y carriles interiores de retorno y exteriores de
drenaje. Sin saucer, rampa corta izquierda ni rueda de rango en el campo.
Recrear la composición, el cohete y el panel lateral con recursos propios.
El panel solo anuncia los dos objetivos que se pueden completar: ambos bancos
y la órbita. En móvil el marcador no reduce el ancho útil del tablero.

Aceptar el cambio si un lanzamiento completo recorre la órbita, las cargas
suaves retornan sin consumir bola, los carriles inferiores cumplen su función
y las dianas y la órbita puntúan por contactos reales. Comprobar física y
compilación servida en escritorio y móvil. Conservar la partida y los controles
existentes, así como la evidencia del trazado anterior. Trabajo local.

## Referencia histórica — boceto anterior

Se observa el port enlazado por el repositorio de descompilación:
https://github.com/k4zmu2a/SpaceCadetPinball → https://pinball.alula.me/.
La imagen compara encuadre, rampa violeta izquierda, grupo superior de bumpers,
rueda de rango, slingshots y panel derecho de puntuación/mensajes. Referencia
adicional facilitada por el propietario: https://www.youtube.com/watch?v=oVKmGNDrLiQ
(el lector web no pudo abrir el vídeo en esta revisión).
No se importan sus bitmaps, sonidos, código ni recursos. Arte procedural propio.
El original completo tiene más mecanismos y misiones; esta iteración no los da por terminados.

## Pasos y recuperación

1. Inspección visual y revisión del motor actual; fijar bloque de mejoras.
2. Reglas de partida/objetivo, colisiones y respuesta visual; composición y elementos del tablero.
3. Tests, revisión independiente, build servido y prueba en escritorio/móvil.
4. Actualizar ficha, roadmap y evidencia; dejar local para revisión del propietario.

Rama feat/pinball-classic-play. Copia acotada del estado anterior en
/tmp/nandos-pinball-20261123. Revertir solo archivos de esta iteración; no tocar
formatos de otros juegos ni datos del visitante. Producción, Neon y RAG no cambian.

## Registro — 23/11/2026

- Árbol inicial limpio. Observado Pinball publicado y referencia en navegador.
- El prototipo de partida dejaba mucho margen negro, la rampa era un carril plano y
  score/targets/slingshots todavía no constituyen una partida clásica.
- La copia local incorpora partida de tres bolas, ensayo libre, puntuación, fin
  y reinicio, primer objetivo de misión, bumpers activos y slingshots. La
  comprobación en navegador del 23/11 se interrumpió antes de cerrar el recorrido
  de juego y la revisión del panel derecho.

## Revisión del trazado anterior — 24/11/2026

El propietario informa de encajamientos, curvas cerradas y elementos amontonados.
Se replantea la geometría desde la captura original del repositorio SpaceCadetPinball,
no desde el aspecto del prototipo. Aceptación: salida sin bumper/collider atravesado,
rampa corta en el lateral medio, rueda de rango más baja, slings y guías separados,
y pruebas que detecten encajamientos antes de la recuperación automática. Se
conservan puntuación y modalidades de la iteración local; no se sube ni publica.
Copias de dominio/motor antes de este ajuste: /tmp/nandos-*-before-20261124.ts.
El navegador conectado no estaba disponible en esa revisión.

### Diagnóstico del trazado anterior al reajuste

- Con 82 pasos de carga a 120 Hz, la bola quedaba inmóvil en el canal superior
  y volvía al lanzador por rescate, sin entrar en juego. El borde interior de
  la curva se plegaba: el desplazamiento lateral de 0,475 superaba el radio
  local estimado de 0,4575. Añadir más muestras no resuelve ese pliegue.
- Se midieron solapes de raíles con bumpers, dianas y guías de los slingshots.
  Bajo el slingshot, el hueco con el flipper levantado bajaba a 0,4116 frente a
  un diámetro de bola de 0,44. No se demostró que el bumper de la salida
  bloqueara la trayectoria centrada ni que los prismas de los slings fueran inválidos.
- Estas medidas corresponden al trazado sustituido por el diseño del 27/11.

## Resultado local — 27/11/2026

- El dibujo y Rapier comparten los trazados de órbita y carriles. Los lanzamientos
  de 82 y 115 pasos llegan al campo desde el lanzador y puntúan sin rescate.
  Las pruebas de motor distinguen cargas débiles, recuperación, impactos en
  ambos bancos y retorno IN frente a pérdida por OUT.
- Durante la prueba se reprodujeron dos encajamientos nuevos: entre el sling y
  el divisor lateral, y en la junta del carril con el pivote. Se abrió el paso
  y se prolongó la guía por debajo del flipper para mantener la pendiente.
  Las cargas de 106 y 125 pasos vuelven a drenar sin rescate con los flippers
  en reposo. Hay una regresión específica para soltar el flipper derecho.
- La revisión independiente detectó contacto de la compuerta al cerrar y
  puntos por golpear el soporte de una diana. El cierre espera a despejar el
  arco de giro y el soporte queda separado de las caras puntuables.
- Con flippers en reposo, la segunda revisión recorrió las 144 cargas: 78
  retornos naturales, 66 órbitas con drenaje y ningún rescate. Al retener
  con el flipper derecho y soltarlo, la bola podía quedar dormida en la guía
  IN. Se despierta al bajar el flipper y se cubre el caso de 129 pasos.
  La revisión final confirmó drenaje natural en ese caso y con ambos
  flippers retenidos en los lanzamientos de 82 y 115 pasos.
- Compilación servida mediante `vite preview`, Chromium 158: escritorio
  1280×757 (Espacio y pausa) y móvil emulado 390×700 (cancelar un toque sin
  disparar y volver a lanzar). En ambos recorridos se completó la órbita
  y el marcador subió a 7.000; se comprobaron los dos flippers simultáneos.
  El panel de escritorio no necesitó scroll;
  en móvil el lanzador quedó por delante del acceso flotante de nandBot.
  La única incidencia en consola fue `/api/portfolio` con el backend apagado.
- `pnpm verify`: compilación, tipos y lint correctos; 319 pruebas superadas.

### Punto de continuación

El 28/11 el propietario autorizó subir esta versión como punto de partida y
dejó pendiente el acabado. En la próxima sesión aportará un boceto a lápiz:
usarlo para ajustar distribución, lectura de la bola y tacto, y repetir las
comprobaciones de física y de la compilación servida antes de cerrar Pinball.
