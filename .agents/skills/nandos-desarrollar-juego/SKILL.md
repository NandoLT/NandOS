---
name: "nandos-desarrollar-juego"
description: "Diseña e implementa mecánicas y prototipos jugables de NandOS, con pruebas de reglas, física, controles y carga de motores web. Úsala al crear o modificar un juego."
---

# Desarrollar un juego web

Parte del [brief y catálogo](../../../docs/games/README.md), reglas existentes y
versiones del lockfile. Para Pinball consulta [su ficha](../../../docs/games/pinball.md).
Define el corte jugable y aceptación antes de pulir arte; conserva la estética W95.
Busca primero en el proyecto; DOM, Canvas o Three/Rapier según necesidad. Justifica
un motor nuevo con peso, licencia, compatibilidad y ADR, sin imponer el mismo a todos.

Separa reglas, adaptador de motor y UI. Azar inyectable en tests, estado por partida,
transiciones y final/reinicio explícitos. En tiempo real desacopla paso de física y
render, limita recuperación tras pausa y libera entradas al perder foco. Centraliza
los parámetros que se ajustan juntos; no externalices cada literal por norma.

Implementa un recorrido jugable completo y luego prueba bordes relevantes: jugada
ilegal, repetición, colisión rápida, bola atrapada, retorno de pestaña, cierre y
recursos. Teclado y táctil no dejan botones pulsados ni generan scroll accidental.
No anuncies FPS, equilibrio o diversión sin medición u observación correspondiente.

Para motor/render/chunks prueba el build servido y una acción real. Registra
viewport, versión, entrada y resultado, consola y límites. No uses el DOM simulado
como prueba de GPU. Distingue fallo reproducible, balance, impresión y acabado.
Declara procedencia de arte/sonido: una referencia visual no concede licencia.
Entrega ficha actualizada y siguiente bloque; no amplíes catálogo sin el encargo.
