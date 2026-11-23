---
name: "nandos-registrar-decision"
description: "Registra decisiones duraderas de arquitectura de NandOS con alternativas, consecuencias y verificación. Úsala al cambiar motores, formatos persistidos, fronteras o infraestructura."
---

# Registrar una decisión

Lee [el índice ADR](../../../docs/adr/README.md) y la decisión vigente afectada.
No necesita ADR un cambio de color, texto o tuning local. Un motor, dependencia
relevante, formato persistido, frontera de confianza o alojamiento sí merece valorar
uno. No conviertas cada función en documentación de arquitectura.

Usa [la plantilla](../../../docs/adr/template.md) con siguiente número, contexto,
opciones viables, decisión y alcance, costes/riesgos, verificación y recuperación.
Distingue propuesta, implementación existente y autorización del usuario. Cuando
el encargo ya permite decidir e implementar, no inventes un trámite de aprobación.

Enlaza código y plan. Si cambias un compromiso, crea sucesor y marca el anterior
Sustituido con su enlace, conservando razones históricas. Para decisiones previas
sin registro, di que el ADR es retrospectivo; no inventes fecha de aprobación.
Prueba la consecuencia relevante y actualiza índice y contexto sin duplicar todo.
