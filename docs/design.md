# Identidad y revisión de experiencia

NandOS es un portfolio explorable con escritorio Windows 95. El usuario ha elegido
esa identidad: bordes biselados, gris, barra azul, menús clásicos y controles
compactos. No reemplazarla por estilos genéricos de landing ni por un tema de una
skill externa. Compara con las referencias del encargo y componentes existentes.

## Invariantes comprobables

- Mantener tamaños coherentes entre escritorio y móvil: barras de título, cerrar,
  minimizar, maximizar, herramientas Writer/Paint y barra de tareas no se agrandan
  por una regla global de botones táctiles. Si falta comodidad, mejora distribución
  o área interactiva sin deformar el dibujo; comprueba también foco y teclado.
- Las ventanas quedan en el área útil sobre la barra de tareas. Revisa aperturas,
  restaurar/maximizar, contenido largo, menús junto al borde y cambios de tamaño.
- Reutilizar menús y confirmaciones de guardado existentes. Writer no expone
  Markdown al usuario; cerrar un documento editado ofrece conservar o descartar.
- El lanzador de nandBot muestra primero la mascota; su bocadillo abre el chat.
  Cerrar el chat conserva la mascota; solo su cierre la retira.
- Conservar nombre accesible, foco visible, teclado y recuperación de errores.
  Una captura no demuestra accesibilidad; un escáner no certifica WCAG.

## Diseñar o corregir

Para un ajuste acotado, mantén la composición vigente y reproduce el defecto.
Para una superficie nueva, concreta tarea, estados y referencia; compara solo las
alternativas que cambien realmente el recorrido. Implementa la elegida y revisa
la interfaz renderizada en escritorio y móvil, con datos largos y estados vacíos
cuando sean relevantes. Registra tamaño de viewport, versión y acción comprobada.

En juegos, los controles táctiles deben evitar scroll/zoom accidental durante la
partida y liberar entradas al perder foco. Las instrucciones van en Ayuda si así
lo requiere la aplicación; no añadir franjas que resten espacio sin necesidad.
