# Infraestructura local de IA de NandOS

Infraestructura Qdrant + LiteLLM + Ollama e ingesta manual de la wiki publicada de Neon development. Los comandos de ingesta solo leen Neon, no publican artículos, no cambian el chat de demostración y no despliegan nada en Vercel.

## Elección de embeddings

Base local: **Qwen3-Embedding 0.6B**, servido por Ollama con `qwen3-embedding:0.6b` (Q8_0, aproximadamente 639 MB de pesos). Licencia Apache 2.0, modelo multilingüe con soporte para más de 100 idiomas y salida de 1024 dimensiones. Usaremos distancia coseno en Qdrant y el alias de gateway `nandos-embeddings`.

Es una elección inicial razonable para probar español y contenido técnico en el equipo disponible (32 GB de RAM, CPU Intel i7-8565U); el rendimiento y la calidad deben medirse con los servicios reales y después con preguntas de la wiki. No depende de una cuota gratuita temporal ni de una suscripción a GPT/Claude. Ejecutarlo consume CPU, memoria, disco y electricidad, pero no activa facturación de proveedores de IA.

Alternativas consideradas: `bge-m3`, también multilingüe y con 1024 dimensiones, o una API remota si más adelante necesitamos menor latencia. No se activa ninguna alternativa ni fallback de pago. El modelo de conversación sigue pendiente de elección.

Los documentos se embeben sin prefijo. Las consultas llevan la instrucción de recuperación en inglés recomendada por Qwen y conservan la pregunta en español. La prueba exige 1024 componentes finitas y un vector no nulo. El límite local de contexto se fija en 8192; la futura fragmentación debe respetarlo. La versión Q8_0 no garantiza reproducir los resultados publicados del modelo sin cuantizar.

Cambiar modelo, cuantización, instrucciones o dimensión exige un perfil/colección nuevos y reconstruir el índice; no mezclar espacios vectoriales. Al descargar el modelo, conservar su identificador mostrado por Ollama como parte de la futura revisión de ingesta.

## Servicios y aislamiento

| Servicio | Imagen fijada | Acceso desde el equipo |
| --- | --- | --- |
| Qdrant | `qdrant/qdrant:v1.20.0` | `http://127.0.0.1:6333`, con API key |
| LiteLLM | `ghcr.io/berriai/litellm:v1.106.6` | `http://127.0.0.1:4000`, con Bearer key |
| Ollama | `ollama/ollama:0.40.13` | Solo red interna de Compose, sin puerto publicado |

Las etiquetas se contrastaron con las versiones oficiales y sus manifiestos el 2 de noviembre de 2026. No se usan `latest` ni `main-stable`. El proyecto Compose es `nandos-ai-local`; no montar el repositorio completo ni el socket Docker en los contenedores. Los únicos datos persistentes son volúmenes propios para Qdrant y modelos de Ollama. `ai:down` conserva ambos volúmenes; no incorpora un borrado automático.

LiteLLM usa el protocolo compatible con OpenAI contra `http://ollama:11434/v1`, no contra OpenAI. La cadena `ollama` de su configuración es un valor de protocolo ignorado por el servidor local, no una clave de proveedor. Solo se expone un modelo de embeddings; no hay rutas comodín ni modelos cloud. Ollama tiene deshabilitado el uso cloud. No se conecta LiteLLM a Neon: se arranca con configuración de archivo y clave maestra local, sin UI de gestión, virtual keys ni base de datos de consumo. Este modo no aplica presupuestos de pago: la protección actual es no configurar proveedores remotos. Antes de producción habrá que resolver alojamiento, TLS, autenticación, observabilidad y límites.

## Preparación y arranque

Desde la raíz del proyecto, **sin sudo**:

```bash
cd /home/nand0x/Projects/NandoOS
pnpm ai:init
pnpm ai:check
```

`ai:init` crea `infra/ai/.env` con dos claves aleatorias distintas y permisos `600`. El archivo está excluido de Git; no se muestran claves, no se sobrescriben las existentes y no se leen ni modifican los `.env` del API o de Vercel. No copies su contenido al chat. `ai:check` valida Compose sin conectarse al daemon ni mostrar la configuración resuelta.

Si Docker funciona sin sudo:

```bash
pnpm ai:up
pnpm ai:pull
pnpm ai:ps
pnpm ai:verify
```

Si `docker ps` falla por permisos pero `sudo docker ps` funciona, ejecutar **en tu terminal**, añadiendo `--sudo` solo a los comandos Docker:

```bash
pnpm ai:up --sudo
pnpm ai:pull --sudo
pnpm ai:ps --sudo
pnpm ai:verify
```

La contraseña se introduce únicamente en la terminal para `sudo docker`. No ejecutar `sudo pnpm`, no abrir los permisos del socket ni añadir automáticamente usuarios al grupo Docker. Los comandos apuntan explícitamente al socket local, sin utilizar un contexto remoto. El primer arranque descarga imágenes que ocupan varios GB; después se descarga el modelo de unos 639 MB. El arranque no implica que el modelo esté descargado: ejecutar también `ai:pull`.

Para parar sin borrar datos:

```bash
pnpm ai:down --sudo
```

Omitir `--sudo` si no lo necesitas. No ejecutar `down --volumes` ni limpiezas globales de Docker como parte del flujo habitual.

## Qué comprueba la verificación

`pnpm ai:verify` solo permite los orígenes locales anteriores, rechaza redirecciones y comprueba que ambos servicios exigen autenticación. Usa seis textos sintéticos (tres documentos sobre CV, contacto y temas, y tres consultas); no lee la wiki ni conversaciones de visitantes. Genera embeddings a través de LiteLLM/Ollama, crea una colección `nandos_smoke_<UUID>` con distancia coseno, inserta los documentos y exige que las tres búsquedas devuelvan la fuente esperada.

Solo elimina esa colección recién creada, también si falla una búsqueda. Si la creación falla o no se confirma, no elimina ninguna colección. Un fallo de limpieza identifica únicamente su colección temporal para revisarla manualmente. No interpreta una prueba con mocks como verificación del modelo real.

Las pruebas automáticas sin servicios son `pnpm test:ai`; cubren contratos y barreras de seguridad mediante respuestas simuladas. Se ejecutan en el flujo habitual de pruebas, no arrancan Docker y no hacen llamadas reales. `pnpm lint` y la compilación de raíz incluyen los scripts de IA y rechazan warnings.

## Estado de la validación

El 2 de noviembre de 2026 Fernando ejecutó `pnpm ai:verify` en su terminal y confirmó el resultado satisfactorio con los servicios reales: autenticación, vectores de 1024 dimensiones, tres búsquedas en español y limpieza de la colección temporal. Wiki y Neon no se modificaron. El agente validó por separado configuración y pruebas automáticas, pero no tuvo acceso al daemon Docker.

Queda validada la conectividad y recuperación básica con esos textos sintéticos. La ingesta de la wiki se describe a continuación; la evaluación amplia de calidad y latencia y el modelo de conversación siguen pendientes.

## Ingesta de wiki publicada (local)

Desde la raíz, con los contenedores arrancados y el modelo descargado:

```bash
pnpm ai:ingest --dry-run
pnpm ai:ingest
pnpm ai:index
pnpm ai:search "¿Dónde puedo descargar el currículum?"
```

- `--dry-run`: consulta solo Neon development y calcula artículos/fragmentos; no llama al modelo ni a Qdrant.
- `ai:ingest`: lee únicamente instantáneas publicadas, fragmenta por encabezados ATX/setext respetando bloques de código, conserva título/categoría/revisión/fecha/sección y genera embeddings en lotes de cuatro. Entradas limitadas por bytes UTF-8, sin ejecutar Markdown ni seguir sus enlaces.
- `ai:index`: compara el corpus publicado con el manifiesto del índice activo y muestra si está sincronizado.
- `ai:search`: recuperación semántica local, con fuentes y Markdown de las revisiones todavía publicadas. No es una respuesta generada por un chatbot.

No requieren `sudo`: no operan Docker. Leen explícitamente `apps/api/.env` e `infra/ai/.env`, regulares y con permisos `600`, sin mostrar ni sobrescribir secretos. El destino de Neon está limitado al hostname exacto de la rama development acordada, con TLS; se rechazan producción, otros destinos y ejecución en Vercel. Si cambia la rama, revisar esta barrera de forma explícita, no desactivarla para reutilizar una conexión de main. No hay migración nueva ni escritura editorial desde estos comandos.

Cada ingesta crea una colección propia `nandos_wiki_dev_<UUID>` y activa el alias `nandos_wiki_development` únicamente después de confirmar todos los fragmentos, el manifiesto y que las publicaciones no cambiaron durante el trabajo. La actualización de alias es una sola operación de Qdrant. Repetir sin cambios no recalcula embeddings. Publicar nuevas revisiones o retirar artículos requiere repetir `ai:ingest`; retirar todos produce un índice válido vacío.

El manifiesto registra perfil de embeddings, huella del corpus y recuentos; su vector técnico queda excluido de las búsquedas. Los IDs de fragmento son deterministas. La búsqueda vuelve a contrastar IDs con las publicaciones actuales de Neon antes de devolver fuentes: descarta revisiones retiradas o sustituidas aunque todavía no se haya sincronizado el índice. No hay alternativa con borradores o semillas cuando falta contenido.

Un fallo previo a la activación conserva el índice anterior y limpia solo su candidato confirmado. Ante una respuesta de activación ambigua, se comprueban todos los alias antes de limpiar y nunca se elimina una colección referenciada. Las colecciones completas anteriores se conservan como recuperación manual; no son el índice consultado. No hay limpieza global ni borrado automático de históricos: antes de producción habrá que definir retención/garbage collection y borrado definitivo según las necesidades de datos.

`infra/ai/wiki-ingestion.local` es un bloqueo temporal ignorado por Git, exclusivo de las ingestas locales. Impide escritores simultáneos en esta máquina y se retira al terminar, también ante errores controlados. Si se interrumpe el proceso por la fuerza puede quedar: comprobar primero que no hay otra ingesta antes de retirar **solo ese archivo**. No usar este bloqueo de archivos como coordinación entre instancias de Vercel.

El perfil inicial incluye modelo, cuantización, dimensión, distancia e instrucciones/fragmentación v1. No se detecta automáticamente una sustitución de pesos bajo la misma etiqueta de Ollama: conservar su identificador y cambiar el perfil/reindexar si se reemplazan. No mezclar un modelo distinto bajo `nandos-embeddings` manteniendo este perfil.

El 4 de noviembre, por autorización expresa de Fernando, se publicaron solo las semillas sin editar de CV, contacto y temas en development para esta validación. No se copiaron publicaciones a main ni se modificaron sus borradores.

Comprobado con servicios reales: ingesta vacía, índice posterior de tres artículos/tres fragmentos, repetición sin cambios, estado sincronizado y tres preguntas en español con la guía esperada como primer resultado. La recuperación devuelve revisión, fecha y sección de la fuente. Las retiradas/revisiones obsoletas, fallos, aislamiento y limpieza están cubiertos por pruebas automáticas; no se retiraron artículos reales del propietario para probarlos. Hubo fallos intermitentes de consulta en comprobaciones iniciales; las posteriores fueron correctas sin cambios de credenciales. Esto no certifica aún calidad amplia, latencia o resiliencia de producción.

## Siguiente entrega

Ampliar la evaluación con más artículos/preguntas, elegir el modelo de conversación y conectar el chat RAG con fuentes y límites. El chat público sigue sin cambios. Los servicios de este portátil no son accesibles desde Vercel; el alojamiento de producción se decidirá por separado.

## Sincronización desde administración

El panel Administración > Wiki muestra «Índice de nandBot», su estado y los botones **Sincronizar wiki** y **Comprobar estado**. Para habilitarlo únicamente en el API local:

```bash
WIKI_LOCAL_AI_ENABLED=true pnpm --filter @nandoos/api dev
```

La web local se inicia como siempre. Alternativamente, el propietario puede añadir `WIKI_LOCAL_AI_ENABLED=true` al `.env` privado del API y reiniciarlo; no modificar el resto de sus valores. La opción está desactivada por defecto y se ignora siempre en Vercel/production. Verifica el índice y los modelos con los comandos de preparación antes de pulsar el botón.

- **Actualizado:** la huella de las publicaciones vigentes coincide con el índice activo.
- **Desactualizado:** hay publicaciones/revisiones/retiradas pendientes o todavía no existe un índice.
- **Sincronizando:** ingesta en curso, también si se inició por terminal. Se impiden duplicados mediante el mismo bloqueo local. Un bloqueo abandonado requiere revisión manual, nunca borrarlo automáticamente mientras pueda existir otra ingesta.
- **Sin configurar:** entorno sin IA habilitada, incluido Vercel por ahora y el laboratorio `/?wiki=1`. El botón no ejecuta una simulación ni intenta alcanzar el portátil.
- **No se pudo comprobar:** fallo de conexión/configuración. Nunca interpretarlo como actualizado.

Guardar borradores o tener texto sin guardar no modifica el estado del índice: solo se indexan las versiones publicadas. Publicar o retirar invalida de inmediato la consulta del estado en el panel, que se vuelve a comprobar; también se verifica al recuperar el foco, recargar la lista o pulsar Comprobar estado. Mientras el panel está visible se revisa cada 30 s y, si hay una ingesta, cada 1,5 s. Si se edita en otra pestaña, la siguiente comprobación recogerá sus publicaciones.

Las rutas privadas `GET/POST /api/admin/wiki/synchronization` exigen sesión de administrador; el POST también exige Origin confiable. Respuestas `private, no-store`, sin claves, conexión Neon, colecciones ni huellas internas. El POST espera la operación y verifica después el estado real, con errores sanitizados y HTTP 409 para un trabajo ya en curso. Solo lee Neon y escribe en Qdrant local, sin publicar artículos ni conectar el chatbot.

## Fuentes oficiales

- [Modelo y descarga en Ollama](https://ollama.com/library/qwen3-embedding:0.6b).
- [Licencia, dimensiones e instrucciones de Qwen](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B).
- [Ollama compatible con OpenAI](https://docs.ollama.com/api/openai-compatibility).
- [LiteLLM sin base de datos](https://docs.litellm.ai/docs/proxy/docker_quick_start#running-without-a-database).
- [Seguridad de Qdrant](https://qdrant.tech/documentation/security/).
- [Alias de colecciones de Qdrant](https://qdrant.tech/documentation/manage-data/collections/#collection-aliases).
- [Permisos de Docker en Linux](https://docs.docker.com/engine/install/linux-postinstall/).
