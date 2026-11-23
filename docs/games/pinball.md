# Pinball — estado técnico y aceptación

Ficha del 22 de noviembre de 2026, posterior a PR #11 y #12. Prototipo jugable;
no es una reproducción completa de Space Cadet ni un juego terminado.

- Entrada: Start > Programas > Accesorios > Juegos > Pinball.
- Escena: Three.js + React Three Fiber; física Rapier con paso fijo de 120 Hz y
  bola con CCD. El motor se carga al abrir la aplicación.
- Reglas y adaptación: [domain/pinball](../../apps/web/src/modules/applications/domain/pinball.ts)
  e [infrastructure/pinball-engine](../../apps/web/src/modules/applications/infrastructure/pinball-engine.ts).
- Lanzador: muelle, carga/liberación, canal curvo y compuerta para limitar retorno.
  Ensayo libre con contador de lanzamientos; faltan puntuación y misiones completas.
- Controles: teclado y zonas directas sobre flippers/muelle; instrucciones en Ayuda.
  El footer visible se retiró para aprovechar la altura del tablero.
- Diseño inspirado en referencias Space Cadet; arte y geometría procedimentales.

## Comprobación de empaquetado

La partición por tamaño de Three.js creó chunks circulares y `Color` sin inicializar.
La corrección agrupa matemáticas, núcleo, shaders y renderizador sin ese ciclo.
Al cambiar dependencias o Vite: compilar, servir con preview, abrir el juego, cargar
y soltar la bola, comprobar contador y consola. Tests de motor y build no bastan
para esta incidencia. No elevar el umbral de avisos para hacer pasar una entrega.

## Siguiente iteración

Seguir afinando geometría, mecanismos y aspecto según la referencia; medir problemas
reales de física. Acordar aceptación de puntuación/misiones cuando se aborde ese
bloque. Después, documentar técnicamente Paint, Writer y todos los juegos antes
de otra aplicación, como solicita el propietario. No marcar estos trabajos como hechos.
