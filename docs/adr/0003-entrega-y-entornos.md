# 0003 — Entornos y aceptación de entrega

Fecha: 2026-11-22. Estado: Vigente; recoge decisiones previas del propietario.

## Contexto

Web/API en Vercel, datos en Neon y coste cero actual. El RAG público espera servidor
propio. Las vistas previas alcanzaron diez ramas de Neon; el Pinball compilaba pero
falló al cargar los chunks hasta corregir sus dependencias de inicialización.

## Alternativas

Cambiar de alojamiento o ampliar plan no resuelve por sí mismo una prueba incompleta.
Usar producción como base de pruebas arriesga contenido real. Conservar entornos
actuales y limpiar copias obsoletas satisface el alcance sin ampliar servicios.

## Decisión

Tests habituales aislados; development para pruebas reales explícitas, main para
producción. Pre-commit y Verify monorepo previos a integración; compilación servida
para WebGL/WASM y verificación funcional de la versión publicada si se despliega.
Las ramas preview de PR integradas se revisan y eliminan cuando sean obsoletas,
con las confirmaciones efectivas. Las PR de GitHub se conservan como historial.

## Consecuencias

READY y CI verde no sustituyen el recorrido. Puede fallar la provisión de preview
sin fallar producción; se debe identificar la causa y no ocultarla. No se habilita
el RAG, se rota una clave ni se contrata infraestructura por este ADR.

## Verificación y recuperación

Relacionar SHA, CI y despliegue; probar carga/acción y consola. Comprobar solo lectura
pública si corresponde. Revertir código conserva compatibilidad de formatos y hashes;
un rollback de seguridad no debe dejar las contraseñas nuevas sin verificación.
Eliminar previews no es una migración ni una copia de seguridad de contenido propio.
