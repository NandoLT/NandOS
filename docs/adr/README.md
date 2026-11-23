# Decisiones de arquitectura

Un ADR explica un compromiso duradero: nueva dependencia/motor, formato persistido,
frontera de seguridad o cambio de alojamiento. Un ajuste cosmético o parámetro de
juego no necesita otro ADR. Los hechos existentes se describen como tales, sin
inventar una aprobación histórica.

| ADR | Estado | Decisión |
| --- | --- | --- |
| [0001](0001-contexto-agentes.md) | Adoptado en esta iteración | Contexto local, skills y revisión acotada |
| [0002](0002-juegos-web.md) | Vigente, documenta implementación existente | Reglas separadas y motores según necesidad |
| [0003](0003-entrega-y-entornos.md) | Vigente, documenta decisiones previas | Vercel/Neon, verificación de artefacto y RAG en espera |

Para otra decisión usa [la plantilla](template.md), un número nuevo y una fecha.
Estados: Propuesto, Adoptado, Sustituido, Rechazado. Indica sucesor al sustituir;
no reescribas el motivo de una decisión anterior para que parezca la nueva.
La autorización se evalúa por el encargo real, no por una firma ficticia en un ADR.
