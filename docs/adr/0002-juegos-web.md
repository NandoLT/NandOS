# 0002 — Reglas separadas y motor según el juego

Fecha: 2026-11-22. Estado: Vigente; documentación retrospectiva del código existente.

## Contexto

Buscaminas y Solitario tienen reglas TypeScript; Paint usa Canvas; Pinball necesita
simulación y escena 3D. Todas las aplicaciones comparten escritorio y ventanas.
Un catálogo creciente debe conservar controles, rendimiento y pruebas útiles.

## Alternativas

Usar Three.js para todo encarece juegos de cartas o casillas. Copiar juegos completos
introduce dependencias/licencias y comportamiento ajeno. Reescribir todo en otro
motor rompe integración. Mantener el motor mínimo adecuado conserva lo existente.

## Decisión

Reglas y transiciones sin DOM cuando sea viable, adaptación del motor separada de
la UI, reutilización del shell. DOM para tableros/cartas, Canvas para dibujo/raster;
Three.js/R3F + Rapier para Pinball. Una dependencia nueva se justifica por necesidad,
peso, licencia y compatibilidad con versiones del lockfile. No hay migración automática.

## Consecuencias

Las reglas se prueban con estados deterministas y controles reales se prueban en
navegador. GPU, WASM y física necesitan pruebas del artefacto, liberación de recursos
y pausa de entradas. Tuning puede vivir en constantes tipadas próximas al dominio;
no se impone externalizar cada número ni crear un motor universal.

## Verificación y recuperación

Tests de reglas, inicio/reinicio, teclado/táctil, perder foco y cierre; comprobar
carga diferida y consola con build servido. [Juegos](../games/README.md) orienta la
siguiente aplicación. Para cambiar de motor conserva formatos y registros o define
migración/exportación; registra otro ADR si cambia este compromiso.
