# Sistema de agentes de NandOS

Inicio: 22 de noviembre de 2026. Retomado: 23 de noviembre de 2026.
Estado: implantación verificada; subida e integración autorizadas por el propietario el 23/11/2026.

## Objetivo y aceptación

Crear un contexto de proyecto mantenible, skills y revisores compatibles con Codex,
a partir de Oponexia y las fuentes propuestas, conservando el escritorio W95 y
los controles existentes. Las instrucciones no sustituyen permisos ni pruebas.

Aceptación:
- Contexto separado en arquitectura, diseño, ingeniería, decisiones y ejecución.
- Skills locales descubribles y revisores acotados, sin imponer modelos ni instalar hooks ajenos.
- Flujo de juegos con reglas comprobables, prueba jugable, rendimiento medido cuando proceda y trazabilidad de recursos.
- ADRs con contexto, alternativas, consecuencias y forma de comprobar/revertir.
- Validación de metadatos, referencias y configuración integrada en CI y pre-commit; pruebas negativas del validador.
- Evaluación independiente de escenarios reales; fallos, límites y siguiente paso registrados.

## Pasos

1. Inspeccionar Oponexia, NandOS y las fuentes; fijar las versiones consultadas.
2. Redactar contexto, ADRs, skills y perfiles específicos; añadir comprobaciones mecánicas.
3. Evaluar instrucciones con casos reales y revisar el cambio; corregir hallazgos.
4. Ejecutar comprobaciones finales y dejar la entrega preparada para revisión del propietario.

## Recuperación

Rama de trabajo `feat/project-agent-system`, base `f03ba2b`.
El único cambio previo era la preferencia de limpieza de Neon en AGENTS; se conserva.
Copia de ese archivo antes de esta iteración: `/tmp/nandos-agents-before-20261122.md`.
No se modifican datos de Neon, infraestructura ni preferencias globales del cliente.
El trabajo se puede retirar revirtiendo únicamente sus archivos/fragmentos, sin
restaurar el árbol completo ni perder cambios ajenos. No se publica en esta tarea.

## Registro

- Revisados AGENTS, skills y revisores de Oponexia; comprobados scripts, CI y módulos reales de NandOS.
- Consultadas las cinco fuentes del usuario y la documentación oficial de personalización.
- Contexto por áreas, tres ADRs, seis skills con metadatos UI y cuatro revisores escritos; sin cambios globales ni instalaciones de terceros.
- La primera evaluación independiente (Arendt) resolvió los escenarios de Pinball, juego de cartas y ajuste móvil sin inventar pruebas, sustituir W95 ni añadir aprobaciones de trámite. Detectó que los controles documentados aún no estaban conectados durante su revisión; esa integración se completó después. Su duda sobre registro explícito de roles se contrastó con el manual oficial: los perfiles standalone no necesitan registro adicional. No se acredita carga nativa en el cliente actual.
- La ejecución se interrumpió por límite de créditos; la corrección que rechazó la revisión automática no llegó a ejecutarse y se retomó el 23 de noviembre.
- Corregido el glob recursivo del índice: antes no cubría documentos en raíz de docs. Once tests del validador pasan, incluidos contenido parcial preparado, enlace a archivo retirado del índice y raíz/subdirectorios.
- Las seis skills pasan quick_validate.py del creador de skills instalado.
- Pre-commit real ejecutado con índice temporal: acepta corpus válido y rechaza un enlace roto preparado aunque el árbol de trabajo sea válido. Hash del índice real conservado; lint-staged no tiene tareas JS/TS para estos cambios.
- Segunda evaluación independiente (Kant): instrucciones coherentes para limpieza de Neon, selección segura de skills externas y evolución del formato de documentos. Reprodujo cuatro defectos P2 del control: ejecutable no preparado, omisión de destinos de enlace fuera del corpus, sangría UI y límite flotante.
- Corregidos los cuatro: el hook ejecuta el validador del índice con raíz explícita, comprueba el corpus en cada commit, exige estructura UI y tipo entero. Las pruebas nuevas detectaron además la evaluación prematura de la ruta por defecto al ejecutarlo desde /tmp; corregida y cubierta por la ejecución real del hook.
- Quince pruebas de controles pasan. Índice alternativo del repositorio real: hook válido aprobado; un validador preparado que sale con código 42 queda bloqueado aunque la copia de trabajo sea válida; índice real intacto.
- Verificación final tras corregir: `pnpm verify` correcto, 301 pruebas (225 web, 48 API, 13 infraestructura y 15 del corpus), compilación, tipos y lint sin avisos. La ejecución previa de 297 pruebas correspondía al control antes de los cuatro hallazgos y no acredita la versión final.
- Segunda pasada de Kant sobre las correcciones: sin nuevos hallazgos; 15/15 pruebas en copia temporal. La simulación de pnpm de sus fixtures se complementa con el hook real y lint-staged ejecutados por el principal en índice alternativo.
- `codex app-server --strict-config --print-startup-config` termina con código 0. Esto acredita aceptación de arranque en la CLI instalada; no demuestra descubrimiento de los perfiles/skills en esta sesión ni aislamiento de los roles. No se imprimieron valores privados.
- `git diff --check` correcto. No hay cambios de aplicación, datos, servicios ni configuración global. Sin CI remoto, commit, push ni despliegue en esta tarea.

## Continuación

El propietario puede revisar desde AGENTS y docs/development. Para subir, conservar
esta entrega como un cambio lógico de herramientas/contexto con sus pruebas; abrir
PR y esperar Verify monorepo. El pre-commit necesita que los archivos de esta nueva
capa estén preparados juntos, incluido scripts/agents/check.py, porque ejecuta la
versión del índice. No hace falta arrancar IA local o Neon para verificarla.
Al abrir una nueva sesión desde la raíz del repositorio, comprobar descubrimiento
nativo si el cliente permite listar skills/roles; si no, seguir el procedimiento
explícito documentado. No presentar esa comprobación pendiente como superada.
Pinball sigue en iteración y la documentación técnica extensa de aplicaciones
permanece como hito posterior, sin ampliar el catálogo por esta entrega.

## Entrega autorizada — 23 de noviembre de 2026

El propietario solicita subir los cambios. Se prepara un único commit de contexto
y herramientas con sus pruebas, PR y control Verify monorepo antes de integrar.
La verificación local completa acreditada es de 301 pruebas. La CI de la PR y los
despliegues posteriores se consultan en GitHub/Vercel; no se dan por aprobados por
esta anotación previa. Se conserva la comprobación pendiente de descubrimiento
nativo en otra sesión.
