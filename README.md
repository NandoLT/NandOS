# NandOS

Portfolio web interactivo con estética de sistema operativo.

## Desarrollo local

```bash
pnpm install
pnpm --filter @nandoos/api db:migrate
pnpm dev
```

Configura antes `apps/api/.env` a partir de `apps/api/.env.example`. `pnpm dev` arranca la web y el API. La web conserva el contenido inicial si el API no está configurado; el panel privado requiere Neon y sus migraciones.

## Comprobaciones sin avisos

`pnpm verify` ejecuta la compilación del monorepo y todas las pruebas habituales. La compilación verifica tipos y ejecuta Oxlint con `--deny-warnings` en web y API. Las pruebas habituales incluyen web, API e infraestructura local de IA con servicios simulados.

Después de instalar las dependencias, ejecuta `pnpm hooks:install` una vez por clon. El pre-commit comprueba el diff preparado y aplica Oxlint a los archivos JavaScript y TypeScript preparados de web y API, incluidos los que tienen cambios parciales.

Abre un pull request para integrar cambios en `main`. GitHub Actions ejecuta **Verify monorepo** con Node.js 24 y el lockfile congelado. Vercel sigue gestionando los despliegues.

Haz un commit por cambio lógico y separa las entregas que toquen áreas distintas. Consulta el [estándar de commits](AGENTS.md).

El proxy web extrae la ruta reescrita con `URL` y `URLSearchParams`, sin acceder al parser auxiliar `request.query` del runtime. Las pruebas cubren este contrato, rutas duplicadas, peticiones autenticadas y cookies. Para comprobar localmente las deprecaciones como fallos: `NODE_OPTIONS=--throw-deprecation pnpm --filter @nandoos/web exec vitest run tests/api-proxy.test.js`.

## Infraestructura local de IA

La preparación local de Qdrant, LiteLLM y embeddings se documenta en [infra/ai/README.md](infra/ai/README.md). Empezar con `pnpm ai:init` y `pnpm ai:check`; los servicios son opt-in y no arrancan con `pnpm dev`. Con los servicios activos, `pnpm ai:ingest --dry-run` prepara la ingesta de la wiki publicada de Neon development; `pnpm ai:ingest` la indexa en Qdrant local, `pnpm ai:index` consulta su estado y `pnpm ai:search "pregunta"` recupera fragmentos con sus fuentes. No se modifica Neon desde estos comandos ni se conecta todavía el chat público.

Administración > Wiki incorpora botón de sincronización y estado actualizado/desactualizado basado exclusivamente en las publicaciones. Habilitarlo en el API local con `WIKI_LOCAL_AI_ENABLED=true pnpm --filter @nandoos/api dev`. Mantiene el bloqueo compartido con la terminal y las comprobaciones de development. En producción/Vercel permanece «Sin configurar» hasta resolver el alojamiento de IA; nunca conectar a 127.0.0.1 desde Vercel. Guardar borradores no desactualiza el índice.

## Laboratorio local de la wiki

Para revisar el editor sin credenciales ni conexión a Neon:

```bash
pnpm --filter @nandoos/contracts build
pnpm --filter @nandoos/web dev --host 127.0.0.1 --port 4173
```

Abre `http://127.0.0.1:4173/?wiki=1`. Esta ruta solo existe en desarrollo. Precarga 37 artículos de ejemplo como borradores y permite probar categorías, búsqueda, Markdown con vista previa y los flujos de guardar, publicar y retirar publicación. Usa memoria aislada: todo se reinicia al recargar y no se modifica el asistente ni el contenido publicado. No uses este laboratorio para conservar trabajo editorial definitivo.

El panel autenticado incorpora «Wiki de nandBot» con el mismo editor y un adaptador HTTP real. El backend valida las sesiones y el origen de escritura. La tabla `wiki_articles` conserva borrador y versión publicada por separado; la lectura pública nunca devuelve borradores. Las revisiones detectan conflictos entre ediciones. El importador inicial solo añade artículos ausentes y no sobrescribe ediciones.

El panel real se abre desde el login habitual > Acceso de administración > Wiki de nandBot (sin `?wiki=1`). Usa el API local y Neon; el laboratorio sigue siendo una prueba en memoria independiente.

Rama de desarrollo acordada en Neon: proyecto `nandos-db` (`shy-truth-31517067`), rama `development` (`br-floral-frog-b90yscar`), derivada de `main` sin caducidad automática. La conexión local se configura en `apps/api/.env`, excluido de Git; `FRONTEND_ORIGIN=http://127.0.0.1:4173` y `DATABASE_URL` debe apuntar al endpoint de esa rama, nunca al de producción. Las credenciales administrativas son las que existían al crear la rama; los cambios posteriores en main no se sincronizan automáticamente.

La migración `apps/api/drizzle/0001_wiki_articles.sql` está aplicada y verificada en **development** y **main**. En producción se añadió únicamente `wiki_articles`, dentro de una transacción y registrando la migración en Drizzle; el portfolio y las cuentas existentes se conservan. Verifica el destino antes de ejecutar `pnpm --filter @nandoos/api db:migrate`. No uses `db:push` ni reinicies el esquema. Para comprobar el adaptador real explícitamente, `WIKI_TEST_DATABASE_HOST=<hostname-exacto-de-development> pnpm --filter @nandoos/api test:wiki-db` crea un artículo temporal, verifica el ciclo completo y elimina solo ese registro. Nunca forma parte de las pruebas automáticas habituales.

Development contiene los 37 artículos iniciales; el 4 de noviembre se publicaron, con autorización del propietario, solo las tres guías iniciales sin editar de CV, contacto y temas para validar la ingesta local. En producción pueden importarse desde Administración > Wiki de nandBot > «Cargar documentación inicial»: la operación es idempotente, solo crea borradores y no sobrescribe artículos existentes. Se ha verificado contra Neon development la creación, lectura, publicación, independencia del borrador, conflicto de revisión y retirada; el artículo temporal de verificación se eliminó al terminar. La ingesta en Qdrant es manual y local: publicar en la wiki aún no cambia las respuestas de nandBot. La configuración local nunca debe migrar producción automáticamente.

Nunca pegues conexiones completas ni contraseñas en el chat o el repositorio. Si se expone una clave, renueva el rol en cada rama donde esa clave siga siendo válida. La rotación de `development` no rota `main`. Para producción, actualiza `DATABASE_URL` en Vercel con la conexión de `main` y haz un redeploy del backend con el mismo código para activar la nueva configuración; no reutilices la conexión local. Los cambios de contraseña deben hacerlos directamente los responsables de las credenciales.

## Sesión local de Invitado

La sesión de Invitado siempre empieza sin ventanas abiertas, tanto al recargar y entrar de nuevo como después de Log off. Las ventanas, el foco y el orden de apilado son estado en memoria; no se recuperan del almacenamiento local. Se conservan las carpetas del visitante, la papelera, las posiciones de iconos y el tema. La migración de preferencias v5 descarta únicamente los antiguos campos de ventanas, sin borrar los datos del escritorio.

## Ayuda y wiki pública

Start > Ayuda abre el lector de la wiki en una ventana del escritorio, con portada, selector de sección y de artículo, y Markdown formateado. Consulta exclusivamente `GET /api/wiki/articles`: no hay acceso a borradores ni documentación de ejemplo como alternativa. Inicio vuelve a la portada; Actualizar vuelve a consultar lo publicado. Se distinguen carga, biblioteca vacía y error de conexión con reintento. La ventana admite los controles habituales de minimizar, restaurar, maximizar, mover, redimensionar y cerrar.

Los cambios editoriales se gestionan en Administración > Wiki de nandBot. Publicar hace el artículo accesible en Ayuda y en la API pública; guardar un borrador no altera esa versión. La documentación inicial describe Ayuda y añade su propia guía, pero su importación no sobrescribe textos ya editados: los artículos existentes sobre Start deben revisarse manualmente. Esto no conecta aún el chatbot con Qdrant ni LiteLLM.

## Estructura del monorepo

- `apps/web`: frontend React + Vite.
- `apps/api`: Fastify, Neon/Drizzle, autenticación administrativa y gestión de contenido/CV.
- `packages/contracts`: contratos compartidos entre frontend y backend.
- `packages/config`: configuración compartida del monorepo.

Consulta [ROADMAP.md](./ROADMAP.md) para las decisiones del proyecto.

La sesión pública de Invitado sigue siendo una simulación y no autentica contra el backend. El panel administrativo se abre desde el login y requiere una cuenta creada con una clave inicial secreta; no hay credenciales `admin/admin` por defecto. Consulta [apps/api/README.md](./apps/api/README.md) para configuración y despliegue.
