# Arquitectura vigente

## Límites

`apps/web` contiene React, Zustand y las aplicaciones del escritorio; `apps/api`
contiene Fastify y módulos de administración, portfolio, wiki y conocimiento.
`packages/contracts` comparte contratos. Las reglas sin DOM viven en `domain`,
los casos de uso/estado en `application`, los adaptadores en `infrastructure` y
la presentación en `ui`. Sigue el módulo real antes de crear otra capa.

En web, [WindowFrame](../apps/web/src/modules/shell/ui/WindowFrame.tsx),
[ProgramMenu](../apps/web/src/modules/shell/ui/ProgramMenu.tsx) y
[el shell](../apps/web/src/modules/shell/ui/NandoOsShell.tsx) coordinan las ventanas.
Busca las bases compartidas de menús, diálogos y botones antes de duplicarlas.
El sistema de archivos del visitante es virtual y persistente en el navegador;
no representa archivos del servidor. Revisa su módulo y migraciones antes de
modificar formatos. Las ventanas y la sesión pública se reinician al entrar.

## Aplicaciones y juegos

Writer usa edición visual y conserva Markdown como formato interno. Paint
trabaja sobre raster/Canvas y guarda imágenes virtuales. Buscaminas y Solitario
separan sus reglas TypeScript de la vista. Pinball usa Three.js/React Three Fiber
y Rapier cargados bajo demanda; consulta [su ficha](games/pinball.md).
Una imagen de referencia orienta la recreación, no acredita licencia de sus recursos.

## Datos y publicación

Vercel aloja web y API; Neon almacena portfolio, cuentas y wiki. Los borradores y
la publicación de wiki son versiones separadas; solo lo publicado es público.
Los comandos y las pruebas de base real, con su destino explícito, están en README.
No sustituir credenciales, ejecutar migraciones o sembrar contenido al arrancar tests.

Qdrant, LiteLLM y Ollama están preparados para uso local explícito. RAG y apertura
del chatbot siguen en espera de servidor propio; esta tarea no los habilita.
No confundir la IA del producto con las herramientas del agente de desarrollo.

Las decisiones de contexto y juegos se conservan en [ADRs](adr/README.md).
La explicación técnica extensa de Paint, Writer y juegos sigue prevista después
de terminar Pinball, antes de otra aplicación; estas fichas no la dan por terminada.
