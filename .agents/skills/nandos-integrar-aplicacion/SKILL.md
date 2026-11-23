---
name: "nandos-integrar-aplicacion"
description: "Integra aplicaciones en el escritorio NandOS, sus menús, ventanas y archivos virtuales. Úsala al añadir una app o cambiar sus asociaciones y persistencia."
---

# Integrar una aplicación

Lee arquitectura y el módulo afectado. Localiza el registro real de aplicaciones,
ProgramMenu, el shell, WindowFrame, componentes compartidos de menú/diálogo y
asociaciones del sistema de archivos antes de añadir otros.

Concreta abrir, restaurar, minimizar, maximizar, cerrar, instancias y cambios sin
guardar. Si hay formato persistido, define validación, compatibilidad y recuperación;
no migres datos silenciosamente ni uses el disco real para simular rutas virtuales.
Writer mantiene edición visual, Paint guarda raster. Reutiliza sus adaptadores
cuando proceda sin convertir sus modelos en un formato universal.

Añade solo los puntos de integración necesarios, con estado de aplicación aislado.
Prueba acceso por menú y archivo si aplica, reapertura y pérdida de foco, ventana
sobre la barra de tareas y el caso de guardado/cancelación. Verifica escritorio y
móvil sin aumentar globalmente los botones. Para juegos usa también la skill de juegos.

Contexto: [arquitectura](../../../docs/architecture.md), [diseño](../../../docs/design.md).
