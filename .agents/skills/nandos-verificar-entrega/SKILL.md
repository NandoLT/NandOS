---
name: "nandos-verificar-entrega"
description: "Verifica entregas de NandOS con varias comprobaciones o cambios delicados, desde requisitos y pruebas hasta artefacto publicado cuando esté autorizado."
---

# Verificar una entrega

Relaciona aceptación y evidencia según [ingeniería](../../../docs/engineering.md).
Recupera diff y trabajo previo. Para código usa `pnpm verify`; para un ajuste
reversible enfoca la comprobación. Registra resultados reales y comandos omitidos.
Los tests habituales no requieren ni escriben Neon o servicios de IA reales.

Revisa reglas y fronteras: rutas privadas/origen, publicación frente a borrador,
importación de archivos y sesiones cuando el cambio las afecte. No copies secretos
a logs. Tests de comportamiento y regresiones del fallo, sin modificar expectativas
para ocultarlo. No conviertas grep o cobertura arbitraria en garantía de seguridad.

Recorre la vía habitual si existe. En WebGL/WASM/chunks abre el build servido,
no solo dev: arranque, una acción, error y consola. Solicita revisión independiente
pertinente según AGENTS para una entrega sustancial; facilita evidencia y alcance,
sin dictar el veredicto. Resuelve hallazgos y repite controles afectados.

Si se autoriza subir/publicar: commits por entidad, PR con Verify monorepo, SHA
remoto, resultado del despliegue y prueba de ese candidato desde el dominio. READY
no implica aceptación. Distingue cuota de preview de defecto de aplicación. Una
publicación puede activar provisión de Neon: no crear pruebas de escritura de paso.

Actualiza plan con resultado, pendientes y recuperación. Revisa aprendizaje útil;
no añadas reglas por cada log ni afirmes controles planeados como operativos.
