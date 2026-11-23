---
name: "nandos-consolidar-aprendizaje"
description: "Conserva aprendizajes comprobados de NandOS en pruebas, instrucciones, ADRs o skills al cerrar tareas. Úsala para evitar regresiones demostradas y mantener el contexto sin acumular reglas especulativas."
---

# Conservar aprendizaje útil

Al cerrar, identifica fallos reproducidos, decisiones estables del usuario o
restricciones comprobadas que evitarían repetir trabajo. Si no hay nada útil,
no inventes otra regla. Las preferencias de otros proyectos no se importan sin contexto.

Actualiza primero la fuente existente: defecto → código y regresión; decisión → ADR;
flujo repetible → skill; identidad → diseño; coordinación → AGENTS; comprobación
mecánica → script/CI cuando aporte valor. Mantén descripción de skill discriminante,
entrada breve y detalles condicionales en referencias enlazadas solo si hacen falta.

Registra evidencia suficiente, sin transcripciones, secretos o rutas de una máquina
que no aporten al repositorio. El fallo de chunks de Pinball obliga a probar el
artefacto, no a prohibir cualquier partición. La cuota de Neon pide limpiar previews
obsoletas, no borrar desarrollo. No eleves incidentes aislados a mandatos universales.

Valida corpus y comportamiento afectado. Si cambian roles o skills sustancialmente,
evalúa [escenarios](../../../scripts/agents/scenarios.json) mediante revisión
independiente con entradas realistas y sin revelar la respuesta esperada. Una
prueba estática no mide al LLM. No instalar observadores, hooks ni cambiar modelo,
confianza o permisos globales por este procedimiento. Actualiza el plan con el
aprendizaje material y su destino.
