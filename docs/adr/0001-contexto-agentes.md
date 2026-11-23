# 0001 — Contexto de proyecto y agentes acotados

Fecha: 2026-11-22. Estado: Adoptado en esta iteración local.

## Contexto

El propietario pide una base como Oponexia, ampliada para juegos, calidad y ADRs.
AGENTS solo recogía commits y limpieza de Neon. Hay CI y tests, pero falta contexto
persistente sobre identidad y recorridos, y la incidencia de Pinball mostró la
brecha entre pruebas unitarias y ejecución del artefacto compilado.

## Alternativas

Importar un estudio completo de Claude añade roles, hooks y supuestos de otro
cliente. Instalar ECC completo añade observadores y mantenimiento no necesarios.
Dejar solo AGENTS sobrecarga una instrucción única. Se elige contexto por áreas,
skills propias pequeñas, cuatro revisores y controles estáticos en el CI existente.

## Decisión

`.agents/skills` es la fuente de procedimientos; `.codex/agents` define revisores
adaptables y `.codex/config.toml` limita dos auxiliares sin cambiar modelo ni permisos.
Se mantiene AGENTS como entrada breve, docs por necesidad, planes y ADRs separados.
Los controles deterministas se ejecutan; el aprendizaje solo incorpora evidencia
reutilizable. Las fuentes quedan fijadas en [su evaluación](../sources.md).

## Consecuencias

Hay documentación que mantener y revisión de conducta que no automatiza el linter.
No se promete aislamiento en lectura por un prompt ni carga automática del cliente
actual. El principal sigue siendo responsable y usa delegación cuando compensa.

## Verificación y recuperación

Validar corpus, probar rechazos e índice, evaluar escenarios con revisor independiente
y ejecutar `pnpm verify`. Resultados en [el plan](../plans/sistema-agentes.md).
Retirar configuración/skills y referencias propias revierte la capa sin tocar
la aplicación, cuentas ni datos. Las convenciones previas de commits y Neon se conservan.
