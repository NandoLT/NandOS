# NandOS — Roadmap del portfolio OS

## Visión

Portfolio web interactivo que presenta la experiencia profesional de Fernando como un sistema operativo personal.

La experiencia debe ser memorable y técnicamente demostrable, pero siempre permitir que un reclutador llegue rápidamente al CV, los proyectos y el contacto.

## MVP

- Animación de arranque breve, saltable con clic, `Enter` o `Esc`.
- Escritorio con fondo personalizado.
- Barra de tareas.
- Menú Start / menú de aplicaciones.
- Bandeja del sistema con volumen, conexión online/offline, reloj y preferencias.
- Acceso directo visible para descargar el CV.
- Explorador de archivos virtual.
- Ventanas reutilizables con:
  - abrir y cerrar;
  - minimizar y restaurar;
  - maximizar;
  - mover;
  - redimensionar;
  - focus y z-index;
  - tamaños mínimos y límites del escritorio;
  - persistencia de la sesión.
- Aplicaciones iniciales:
  - About Me;
  - Experience;
  - Projects;
  - Skills;
  - CV Viewer;
  - Settings.

### Iteración local en curso

- Flujo de entrada: BIOS/POST estilizado, carga breve de componentes visuales, login de demostración como `Invitado` (contraseña `12345`) y escritorio.
- Boot, login y apagado siguen el theme Classic 95 del escritorio: fondo teal, ventanas grises biseladas, barras de título azul marino y controles clásicos; el POST usa una consola negra con texto verde.
- La marca visible es **NandOS**. El menú de aplicaciones utiliza un emblema SVG circular con una `N` pixelada, acorde con la estética retro del escritorio.
- El login es solamente parte de la presentación: no protege contenido, no autentica al visitante y no guarda la contraseña.
- El menú Start y el escritorio abren About Me y File Explorer como ventanas distintas. El Explorador navega por un sistema de carpetas virtual.
- Las ventanas admiten arrastre, minimizar/restaurar, maximizar y redimensionar desde la esquina inferior derecha en escritorio; en móvil ocupan el viewport.
- Escritorio sin encabezado de marca: los accesos del sistema son About Me, CV, Este equipo y Papelera de reciclaje; todos se pueden recolocar arrastrándolos, aparecen por encima de los demás iconos durante el movimiento y se ajustan a la celda libre más cercana de la cuadrícula.
- El menú contextual del escritorio permite crear carpetas del usuario. Solo estas carpetas se pueden enviar a la Papelera, restaurar o eliminar definitivamente; los accesos del sistema muestran un aviso estilo Windows si se intenta eliminarlos, incluso desde el menú contextual o soltándolos sobre la Papelera.
- La sesión local conserva carpetas creadas y elementos de la Papelera en `localStorage`; la Papelera pide confirmación antes de vaciarse o eliminar elementos definitivamente.
- Las aplicaciones futuras muestran un popover propio al hover/foco y un aviso al activarlas.
- Start se organiza como Windows 95: Programas, Documentos, Configuración y Buscar despliegan submenús; Ayuda y Ejecutar aparecen como accesos directos y Apagar queda separado al pie. En móvil, los submenús se abren dentro del menú para no salirse de pantalla.
- Configuración abre una ventana propia. Su sección Apariencia permite alternar Classic 95 y Modern Desktop, con una previsualización y persistencia local de la elección; Sistema y Accesibilidad quedan anunciados para futuras iteraciones.
- Las aplicaciones Experiencia, Proyectos, Habilidades y Contacto ya son accesibles desde Programas y utilizan contenido tipado separado de sus componentes visuales. No se inventan empresas, fechas ni titulaciones; los datos de contacto publicados son los proporcionados por Fernando.
- El escritorio ofrece un acceso directo de descarga al CV en español; Documentos y Contacto permiten descargar las versiones española e inglesa con nombres neutros. El contenido de los PDF aún conserva campos por actualizar y debe reemplazarse antes de considerar definitiva su información.
- El acceso del escritorio al CV se identifica con un documento PDF en SVG y el nombre `CV_Fernando_Lopez`. Los accesos al CV desde Programas y Documentos abren el PDF en una pestaña nueva, conservando la sesión de NandOS.
- Contacto muestra ubicación, disponibilidad para remoto, teléfono, email, LinkedIn y GitHub; los enlaces usan `mailto:`, `tel:` y las direcciones web correspondientes.
- Volumen, red y reloj tienen controles con tooltips coherentes; sus ajustes funcionales quedan para una iteración posterior.
- “Apagar” reproduce una secuencia de cierre y deja una pantalla final que indica que se puede cerrar la pestaña. Por las restricciones del navegador no detiene el servidor local ni puede cerrar de forma fiable una pestaña abierta por el usuario; el servidor se para desde la terminal que lo inició.
- La animación de inicio queda preparada para pulir más adelante hacia un estilo Linux (servicios) o BIOS/Windows 95.

## Catálogo de aplicaciones

### Pulido de experiencia — validado en local

- Acceso inmediato «Entrar como invitado», conservando el formulario de demostración.
- Boot completo en la primera visita y al reiniciar explícitamente; movimiento reducido omite la espera de la animación.
- Accesos de escritorio a Proyectos y Contacto, con migración de las posiciones anteriores.
- Menús navegables con flechas, Enter y Escape; foco de vuelta al acceso al cerrar una ventana.
- En móvil: rejilla desplazable, controles ampliados, ventanas adaptadas a la altura visible, un toque para abrir y pulsación larga para acciones.
- «Log off Invitado» junto a «Apagar»: vuelve al login, cierra las ventanas y conserva carpetas, papelera, posiciones y tema. Ambas acciones comparten columnas de icono y texto alineadas, sin puntos suspensivos.
- Iteración validada en local por Fernando y autorizada para subir al repositorio.

Las aplicaciones se registran en un `App Registry` común para alimentar el escritorio, el menú Start, el explorador y la barra de tareas.

### Aplicaciones funcionales prioritarias

- File Explorer.
- CV Viewer.
- Terminal con comandos como `about`, `projects`, `skills`, `contact`, `download cv` y `neofetch`.
- Settings con themes, sonido, escala y accesibilidad.
- Administrador de tareas disponible en Start > Programas. Muestra las ventanas reales de la sesión y permite activarlas, restaurarlas o cerrarlas. Writer y Paint conservan la confirmación si hay cambios sin guardar.
- Writer / Notepad para explicar proyectos, principios y forma de trabajo.
- Paint disponible en Start > Programas. Primera versión con dibujo, paleta, historial y archivos PNG virtuales. Quedan pendientes selección, texto y herramientas adicionales.

### Aplicaciones futuras

- Internal Browser.
- Mail / Contact.
- mIRC / IRC Chat: cliente IRC real integrado mediante iframe en una ventana de NandOS, con inspiración visual en mIRC.
- Media Player.
- Calendar / Timeline.
- Calculator.
- Code Editor.
- System Information.
- Minesweeper o Solitaire como easter eggs.

Las aplicaciones futuras aparecerán en el menú con aspecto desactivado. No se utilizará necesariamente el atributo HTML `disabled`, porque debe poder mostrarse información al recibir foco o hover. Se usará `aria-disabled="true"`, se bloqueará la acción y se mostrará un popover:

> Calculadora estará disponible próximamente.

El popover debe funcionar con hover, teclado y toque en móvil.

### mIRC / IRC Chat — aplicación futura

- Añadir una experiencia IRC funcional dentro de una ventana del sistema mediante un cliente web embebido en un `iframe`: elección de nick, conexión a una red, canales, lista de usuarios, mensajes privados y comandos admitidos por el cliente elegido.
- mIRC es un cliente nativo de Windows; no se ejecutará su `.exe` directamente en el iframe. Mantenerlo como referencia de la experiencia retro y evaluar un cliente IRC web compatible con incrustación, como Kiwi IRC. Cliente, red y canal quedan pendientes de elección; no prometer paridad con todas las funciones del mIRC nativo.
- Registrar la aplicación en el catálogo común y mostrarla inicialmente desactivada con el popover «mIRC estará disponible próximamente». Al implementarla, conservar los controles de ventana habituales y cargar el cliente externo solo al abrir la aplicación; informar antes de conectar con servicios de terceros.
- Validar licencia, permiso de incrustación, HTTPS y conexión IRC mediante WebSocket seguro o pasarela compatible, permisos mínimos del iframe y políticas de contenido. No trasladar credenciales administrativas al cliente ni guardar contraseñas IRC en `localStorage` o URLs. Esta idea permanece en backlog y no modifica la prioridad actual de wiki/RAG.

Referencias: [mIRC para Windows](https://www.mirc.com/about.html) y [documentación de incrustación de Kiwi IRC](https://kiwiirc.com/embedding).

## Persistencia: dos responsabilidades separadas

### `localStorage` — experiencia del visitante

Guarda la interacción de cada visitante con el sistema:

- ventanas abiertas;
- posiciones y tamaños;
- aplicación activa;
- tema seleccionado;
- volumen y sonido;
- preferencias de animación;
- escala de interfaz;
- última sesión del escritorio.

No se deben guardar movimientos del ratón en cada píxel. Se persiste al finalizar una interacción o mediante debounce.

Zustand será el dueño de este estado, usando `persist`, versiones, migraciones y validación durante la rehidratación.

### Base de datos — configuración sobre Fernando

Guarda datos editables relacionados con el portfolio:

- perfil;
- presentación;
- experiencia;
- proyectos;
- habilidades;
- enlaces de contacto;
- URLs de los CV;
- aplicaciones habilitadas;
- mensajes de boot;
- themes disponibles;
- theme por defecto;
- feature flags.

La base de datos es la fuente de verdad del contenido profesional. El visitante la consume en modo lectura.

## Themes

El sistema tendrá un `Theme Registry`.

Cada theme puede modificar:

- fondo del escritorio;
- colores de ventanas y barra de título;
- bordes y sombras;
- iconos;
- tipografía;
- sonido;
- animación de inicio;
- densidad de la interfaz.

La definición del theme podrá venir de la base de datos en una fase posterior, mientras que la elección del visitante se guardará en `localStorage`.

Themes iniciales propuestos:

1. Classic 95.
2. Modern Desktop.
3. Developer Terminal.

## Arquitectura

### Estructura del monorepo

`NandoOS` será un monorepo independiente del resto del proyecto de búsqueda de trabajo:

```text
NandoOS/
├── apps/
│   ├── web/                  # React + Vite
│   └── api/                  # Fastify, activo para administración y datos
│
├── packages/
│   ├── contracts/            # DTOs y esquemas compartidos
│   └── config/               # TypeScript, ESLint y testing
│
├── docs/
│   └── architecture.md
│
├── ROADMAP.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.workspace.ts
├── playwright.config.ts
└── README.md
```

Se utilizarán los nombres `apps/web` y `apps/api` en lugar de `frontend` y `backend`, porque son aplicaciones desplegables independientes.

El frontend público sigue siendo el MVP visual; el panel privado activa ahora `apps/api` porque requiere persistencia remota y autenticación real.

### Organización del frontend

```text
apps/web/src/
├── app/
│   ├── providers/
│   ├── router/
│   └── bootstrap/
├── modules/
│   ├── shell/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── ui/
│   ├── portfolio/
│   ├── personalization/
│   └── applications/
├── shared/
│   ├── ui/
│   ├── styles/
│   └── lib/
├── content/static/
└── main.tsx
```

La organización será modular y orientada a funcionalidades, evitando una carpeta global de componentes, hooks y utilidades sin contexto.

### Organización del backend

```text
apps/api/src/
├── app.ts
├── server.ts
├── modules/
│   ├── portfolio/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── adapters/
│   │   └── infrastructure/
│   └── themes/
└── shared/
```

El backend seguirá una arquitectura hexagonal con dominio, casos de uso, adaptadores e infraestructura.

### Paquetes compartidos

Inicialmente solo existirán dos paquetes compartidos:

- `contracts`: tipos, DTOs y esquemas de validación compartidos entre web y API.
- `config`: configuración común de TypeScript, ESLint, Vitest y Playwright.

No se compartirá un paquete de dominio entre frontend y backend hasta que exista una necesidad clara. Cada lado puede tener reglas de negocio diferentes y se evitará el acoplamiento prematuro.

### Tooling

- `pnpm workspaces` para gestionar el monorepo.
- React + TypeScript + Vite para `apps/web`.
- Fastify + TypeScript para `apps/api`.
- Emotion.
- Zustand.
- TanStack Query únicamente para datos remotos.
- Vitest.
- React Testing Library.
- Playwright.

No se añadirá Turborepo al inicio. Se incorporará solo si el crecimiento del monorepo justifica cachear builds, tests o tareas.

### Despliegue y proveedores

La plataforma principal será Vercel. El proyecto se desplegará desde GitHub mediante CI/CD, manteniendo el frontend y el backend dentro del mismo monorepo.

La configuración prevista será:

```text
portfolio-web → apps/web
portfolio-api → apps/api
```

- `portfolio-web`: frontend React + Vite.
- `portfolio-api`: backend Fastify + TypeScript.
- Ambos proyectos compartirán repositorio, paquetes y configuración, pero podrán desplegarse y revertirse de forma independiente.
- Se utilizarán Related Projects o rewrites para conectar previews y evitar URLs de API hardcodeadas.
- `portfolio-web` y `portfolio-api` se desplegarán de forma independiente cuando queden configurados los proveedores y secretos.

No se utilizará inicialmente Vercel Services para juntar ambos servicios en un único proyecto, porque es una funcionalidad beta y no es necesaria para el MVP.

### Base de datos

La base de datos elegida será **Neon PostgreSQL**, conectada mediante Vercel Marketplace.

Motivos:

- PostgreSQL relacional, adecuado para perfil, experiencia, proyectos, habilidades, themes y configuración.
- Branches de base de datos para previews y pruebas.
- Escalado automático y scale-to-zero.
- Integración con el ecosistema de Vercel.
- Posibilidad de gestionar la base de datos bajo el mismo paraguas de Vercel.

El acceso desde el backend se realizará mediante **Drizzle ORM** y contratos validados en los límites de la aplicación.

Supabase queda como alternativa futura si aparece la necesidad de autenticación, storage de archivos, realtime o un panel administrativo más completo.

La base de datos no almacenará la sesión de interacción de cada visitante. La separación será:

```text
localStorage → ventanas, posiciones, theme elegido, volumen y preferencias del visitante
Neon         → perfil, experiencia, proyectos, themes disponibles y configuración de NandOS
```

La administración activa el backend y la base de datos para el contenido profesional; los themes editables desde el panel quedan como mejora posterior.

### Frontend

- React.
- TypeScript.
- Vite.
- Emotion para tokens y estilos dinámicos.
- Zustand para estado de sesión e interacción.
- TanStack Query para el contenido remoto servido por el API.
- Vitest.
- React Testing Library.
- Playwright.

Arquitectura frontend orientada a módulos y casos de uso, inspirada en hexagonal:

- `domain`: reglas puras, sin React ni APIs del navegador.
- `application`: casos de uso.
- `infrastructure`: localStorage, APIs del navegador y cliente HTTP.
- `ui`: componentes y composición React.

### Backend

- Fastify + TypeScript.
- API separada del frontend.
- Arquitectura hexagonal.
- DDD selectivo por contextos:
  - Shell;
  - Portfolio;
  - Personalization;
  - Contact.
- Contratos compartidos y validación en los límites.

## Orden de desarrollo

### Fase 0 — Fundaciones

- Crear proyecto React + TypeScript.
- Definir modelos de ventanas, aplicaciones, themes y sesión.
- Crear `App Registry` y `Theme Registry`.
- Definir separación entre estado local y contenido personal.
- Configurar tests.

### Fase 1 — Shell

- Boot.
- Escritorio.
- Barra de tareas.
- Bandeja del sistema.
- Menú Start.
- Themes iniciales.

### Fase 2 — Window Manager

- Implementar una ventana completa como vertical slice.
- Añadir abrir, cerrar, minimizar, maximizar, restaurar, mover y redimensionar.
- Gestionar focus, z-index y límites.
- Añadir persistencia local.

### Fase 3 — File Explorer y catálogo

- Árbol virtual de carpetas.
- Navegación y breadcrumbs.
- Integrar aplicaciones funcionales.
- Mostrar aplicaciones futuras bloqueadas con popover accesible.

### Fase 4 — Portfolio

- About Me.
- Experience.
- Projects.
- Skills.
- CV Viewer.
- Terminal.
- Settings.

### Fase 5 — Calidad

- Accesibilidad por teclado.
- `prefers-reduced-motion`.
- Responsive / modo tablet.
- Estados vacíos y errores.
- Tests de interacción.
- Revisión visual.
- Rendimiento.

### Fase 6 — Backend y datos dinámicos

- Fastify.
- API de portfolio.
- TanStack Query.
- Base de datos.
- Panel privado de edición si aporta valor real.

## Primera vertical slice

Boot → escritorio → abrir About Me → mover ventana → minimizar → restaurar → recargar página → recuperar sesión.

Las ideas avanzadas se mantendrán en backlog hasta que el shell, las ventanas, la persistencia local, los themes y el contenido profesional estén sólidos.

## Fase actual — panel de administración y contenido dinámico

- Mantener separados el acceso de demostración `Invitado` y la identidad real del administrador. El acceso administrativo se inicia desde la pantalla de login, pero la sesión se valida siempre en el backend.
- No desplegar credenciales por defecto. Crear la primera cuenta con una clave bootstrap aleatoria configurada en entorno, exigir contraseña de al menos 12 caracteres y permitir cambiar usuario y contraseña desde el panel.
- La sesión administrativa usa cookie `HttpOnly`, `Secure` en producción y vencimiento; validar el origen en escrituras, limitar intentos y revocar sesiones al cambiar credenciales.
- Migrar a contenido remoto las secciones públicas editables: perfil, textos introductorios, experiencia, proyectos, habilidades, contacto y CV.
- Guardar los datos como un agregado JSONB de portfolio, con borrador y versión publicada. El visitante solo recibe la versión publicada; el administrador puede guardar cambios y publicarlos explícitamente.
- Conservar revisiones publicadas y versiones anteriores de CV para facilitar correcciones y volver a seleccionar un archivo.
- Neon/PostgreSQL y Drizzle para registros y metadatos; Vercel Blob para PDF públicos descargables. Validar tipo de archivo y límite de 4 MB antes de almacenar.
- Desplegar `apps/api` como Fastify en un proyecto Vercel separado y mantener `apps/web` estático. Un proxy `/api` en el proyecto web conserva el mismo origen del navegador y evita depender de cookies de terceros entre dominios `vercel.app`.
- Variables de entorno: API (`DATABASE_URL`, `FRONTEND_ORIGIN`, `ADMIN_BOOTSTRAP_KEY`, `BLOB_READ_WRITE_TOKEN`); web (`NANDOS_API_ORIGIN`; `VITE_API_URL` se deja vacío al usar el proxy). Aplicar migraciones antes de habilitar el panel y configurar correctamente Production/Preview.
- Las preferencias de interacción del visitante siguen en `localStorage`; nunca se trasladan a la base de datos del portfolio.
- Próximas mejoras del panel: historial/restauración de revisiones de contenido, vista previa antes de publicar, configuración editorial de themes y auditoría de cambios.

## Próximo bloque — asistente de escritorio y wiki con RAG

- Priorizar este bloque antes de la Terminal. Asistente visual inspirado en el clip clásico de Office, integrado en los themes de NandOS y con chat minimizable y accesible.
- Incorporar una wiki editable y ampliable en administración: artículos, borradores, versiones y publicación explícita. Neon conserva el contenido original y es la fuente de verdad.
- Implementar en el backend los casos de uso de ingesta y consulta RAG, con puertos y adaptadores para proveedores de IA y almacenamiento vectorial.
- Utilizar Qdrant como índice vectorial reconstruible y LiteLLM como gateway de modelos. Mantener separados y configurables el modelo de conversación y el de embeddings.
- Indexar solo contenido publicado y autorizado para el asistente. Ingesta con fragmentación por secciones, metadatos de artículo/versión, reintentos y estado visible en administración; excluir versiones retiradas u obsoletas de las consultas.
- Respuestas con fuentes recuperadas y reconocimiento de información insuficiente. Sin permisos para modificar datos o ejecutar acciones en la primera versión.
- Incorporar límites de consumo, protección de credenciales en servidor, pruebas de recuperación y aislamiento entre contenido público y administrativo.
- Orden acordado: integrar primero personaje y conversación de demostración en local → wiki en administración → ingesta e índice → consultas de prueba → conectar chat público → validación y despliegue.

### nandBot — integración en el escritorio y chat de demostración

- Acceso fijo en la esquina inferior derecha, por encima de la barra de tareas: icono de ayuda con «¿Tienes dudas?». No abrir conversaciones automáticamente.
- Primer clic: mostrar la mascota pequeña y transparente (200 px), entrando desde arriba con caída, compresión al aterrizar y dos rebotes amortiguados de estilo cartoon. Encima, solo bocadillo para abrir/minimizar el chat y ocultar el asistente; sin botón de pausa. La mascota también permite abrir la conversación. Omitir la entrada con movimiento reducido.
- Ventana retro reutilizando el marco de NandOS: mover, minimizar al bocadillo, maximizar/restaurar, redimensionar y cerrar con Escape. En móvil se adapta al espacio disponible sin superponer la mascota al chat.
- Bienvenida: «¡Hola! Soy nandBot, tu asistente en NandOS. Estoy aquí para ayudarte a conocer a Fernando y explorar su escritorio. ¿Qué necesitas?».
- Cada apertura comienza con presentación y preguntas iniciales sobre CV, contacto, experiencia, proyectos y funcionamiento de NandOS. La presentación desaparece con la primera consulta. Permitir texto libre, Enter para enviar, Shift+Enter para salto de línea y borrar la conversación.
- Preguntas frecuentes siempre accesibles desde un menú flotante anclado al pie del chat, fuera del scroll y sin desplazar el contenido. Las consultas frecuentes reemplazan la consulta/respuesta anterior, incluso cancelando una consulta pendiente. Solo el texto libre acumula conversación; cambiar entre preguntas frecuentes y conversación libre comienza un contexto nuevo.
- Esta iteración usa respuestas deterministas locales, claramente marcadas como demostración sin IA. Para datos profesionales usa el contenido público del portfolio; no añade información inventada. Las respuestas desconocidas explican la limitación.
- Enlaces de acción explícitos para abrir CV en otra pestaña o navegar a las secciones existentes; nunca ejecutar acciones automáticamente a partir de una respuesta.
- Animaciones vinculadas a la interacción: reposo, escucha al escribir, pensamiento durante la consulta y gesto de respuesta. Respetar movimiento reducido y pestaña oculta, sin controles de pausa visibles en el asistente integrado.
- Estado del asistente únicamente en memoria: no persistir visibilidad, historial, borrador ni pausa. Al recargar o cerrar y volver a abrir sesión, mostrar siempre el botón «¿Tienes dudas?», con avatar oculto y chat cerrado. Retirar solo la antigua clave `nandos:assistant`, sin tocar themes ni preferencias del escritorio. La conversación (máximo 40 mensajes de texto libre) también se reinicia al cerrar, minimizar u ocultar; cancelar consultas pendientes para impedir respuestas de sesiones anteriores. No enviar conversaciones a IA, API ni BD en esta fase.
- Puerto `AssistantService` separado del adaptador de demostración para conectar después el backend RAG con LiteLLM y Qdrant, sin acoplar la interfaz a un proveedor.
- Wiki futura: editor Markdown con vista previa; cubrir absolutamente todos los elementos y submenús de Start, aplicaciones disponibles y futuras, escritorio, ventanas, configuración y contenido profesional. Borradores/publicación explícita; solo contenido publicado se indexa. Conservar encabezados y metadatos de artículo/versión en la fragmentación para citar fuentes.
- Desarrollo y revisión local primero. No subir al repositorio ni desplegar hasta validación del propietario.

### Siguientes pasos tras depurar la interacción de nandBot

1. Wiki en administración: artículos por categorías, editor Markdown y vista previa, borrador/publicado.
2. Persistencia de la wiki en Neon, separada del portfolio; publicación explícita y documentación de todo Start, aplicaciones actuales/futuras, escritorio, ventanas, configuración e información profesional.
3. Ingesta backend del Markdown publicado: fragmentación por encabezados, embeddings e índice reconstruible en Qdrant con versiones y fuentes.
4. Elegir modelos de conversación/embeddings y configurar LiteLLM, sin activar servicios de pago hasta acordar proveedor y presupuesto.
5. Conectar el chat al backend RAG, citar fuentes, reconocer información insuficiente y verificar recuperación, seguridad y límites antes del despliegue.

### Embeddings e infraestructura local — validación inicial (2 de noviembre de 2026)

- Elección inicial: Qwen3-Embedding 0.6B Q8_0 mediante Ollama, alias LiteLLM `nandos-embeddings`, 1024 dimensiones y distancia coseno. Modelo multilingüe y Apache 2.0, sin proveedor de pago; validar rendimiento y recuperación en español antes de darlo por definitivo. El modelo de conversación queda pendiente.
- Servicios opt-in con Compose, imágenes oficiales versionadas (Qdrant v1.20.0, LiteLLM v1.106.6 y Ollama 0.40.13), volúmenes propios y autenticación local. Qdrant y LiteLLM ligados a 127.0.0.1; Ollama solo en la red interna y con cloud deshabilitado. Sin base de datos adicional para LiteLLM ni cambios en Neon o Vercel.
- Comandos `ai:init`, `ai:check`, `ai:up`, `ai:pull`, `ai:ps`, `ai:verify` y `ai:down`. Claves locales aleatorias en `infra/ai/.env`, permisos 600, excluidas de Git, sin sobrescritura ni impresión. Opción `--sudo` limitada a Docker; no modificar grupos, permisos del socket ni ejecutar pnpm como administrador.
- Preparada una prueba opt-in de extremo a extremo con textos sintéticos: autenticación, embeddings y tres búsquedas en español dentro de una colección temporal propia, eliminada al finalizar. Pruebas automáticas con mocks separadas de la ejecución real. No ingerir todavía artículos ni conectar el chat público.
- Guía en `infra/ai/README.md`. Docker requiere sudo en la terminal del propietario; no se han cambiado grupos ni permisos del socket. El 2 de noviembre Fernando confirmó la ejecución real satisfactoria de `pnpm ai:verify`: autenticación, vectores de 1024 dimensiones, tres búsquedas en español y eliminación de la colección temporal. Wiki y Neon permanecen sin cambios. Esta comprobación la ejecutó el propietario, no el agente mediante acceso al daemon.
- Validación de esta preparación: Compose correcto, claves locales privadas e ignoradas por Git, 13 pruebas nuevas de infraestructura junto a las 126 existentes, tipos y compilación correctos, y lint sin warnings ni errores. Sin nuevos paquetes de ejecución ni cambios en la API pública.
- Siguiente entrega: ingesta del Markdown publicado desde Neon development, fragmentación por encabezados, metadatos de artículo/revisión, embeddings mediante LiteLLM e índice reconstruible en Qdrant. Después validar búsquedas sobre la wiki real, sincronización de retiradas y estado en administración. Las tres búsquedas sintéticas no sustituyen una evaluación de calidad ni de rendimiento con ese corpus; el chat público sigue en modo demostración.

### Ingesta de wiki — primera entrega local (4 de noviembre de 2026)

- Módulo backend `knowledge` con dominio de corpus/fragmentos, puertos de fuente publicada/embeddings/índice, casos de uso de planificación, ingesta, estado y recuperación, y adaptadores HTTP locales LiteLLM/Qdrant. Reutiliza la consulta de instantáneas publicadas del repositorio de wiki; no lee borradores en ese camino.
- Fragmentación determinista por encabezados Markdown ATX/setext, ignorando encabezados dentro de bloques de código. Acotar entradas por bytes UTF-8 sin perder texto ni cortar pares Unicode; mantener artículo, revisión, publicación, categoría y jerarquía de sección para futuras fuentes.
- Perfil inicial versionado Qwen3-Embedding 0.6B Q8_0/1024/coseno e instrucción de consultas Qwen, con embeddings en lotes de cuatro. El identificador real de pesos de Ollama todavía requiere control manual: no detectar automáticamente cambios bajo la misma etiqueta.
- Índice reconstruible mediante colección candidata propia y cambio de alias en una única operación tras completar fragmentos/manifiesto y releer las publicaciones. Huella de corpus para omitir ingestas sin cambios, comprobación de recuentos/dimensiones, bloqueo local contra escritores simultáneos y limpieza exclusiva de candidatos confirmados sin alias. Conservar snapshots completos anteriores para recuperación manual; definir retención/limpieza antes de producción.
- Una nueva ingesta reemplaza el conjunto activo, incluidas revisiones retiradas y corpus vacío. La búsqueda contrasta IDs de fragmentos con las publicaciones vigentes de Neon antes de devolver texto/fuentes, sin alternativa de borradores ni payloads arbitrarios del índice.
- Comandos opt-in `ai:ingest --dry-run`, `ai:ingest`, `ai:index` y `ai:search`. Configuración privada explícita, destino Neon development exacto con TLS, servicios de IA fijos en loopback y prohibición de ejecución en Vercel/production. Sin nuevas rutas HTTP, paquetes, migraciones, credenciales ni proveedores de pago.
- Validación real: ingesta vacía y posterior índice de tres artículos/tres fragmentos; repetición detectada como «sin cambios»; estado sincronizado; búsquedas de CV, contacto y temas con su guía esperada en primera posición. Se observaron fallos intermitentes de consulta durante comprobaciones iniciales; las comprobaciones posteriores fueron satisfactorias sin cambiar credenciales ni registrar errores privados. No confundir estas tres preguntas con una evaluación amplia de calidad, rendimiento o resiliencia.
- Publicación editorial autorizada expresamente por Fernando: únicamente las tres semillas sin editar de CV, contacto y temas en development. El resto permanece sin publicar; no sobrescribir borradores ni tocar main/producción. Los comandos de ingesta son de solo lectura sobre Neon.
- TDD: 20 casos nuevos de dominio, ingesta, recuperación, adaptadores, aislamiento y bloqueo; 159 pruebas totales (110 web, 36 API y 13 infraestructura). Lint sin warnings/errores, tipos y compilación correctos. Cambios conservados en local, sin commit, push ni despliegue.
- Siguiente punto: integrar estado y controles de sincronización en administración y ampliar la evaluación con la wiki real. Después elegir modelo de conversación y conectar el chat al RAG con fuentes y límites. El chat público sigue siendo una demostración; el despliegue de estos servicios se resolverá por separado.

### Control de sincronización en administración (4 de noviembre de 2026)

- Incorporar «Índice de nandBot» al panel real de wiki, con botones «Sincronizar wiki» y «Comprobar estado», estados Actualizado/Desactualizado/Sincronizando y recuentos publicados/indexados/fragmentos. Estado desconocido o infraestructura ausente se muestran explícitamente como «No se pudo comprobar» / «Sin configurar», nunca como actualizado.
- Comparar la huella de las instantáneas publicadas con el índice Qdrant activo; guardar borradores o tener texto sin guardar no desactualiza el índice. Publicar nuevas revisiones o retirar invalida y vuelve a comprobar el estado. Comprobaciones al entrar, recuperar foco, recargar lista y periódicamente mientras el panel está visible; no almacenar el estado en localStorage. El caché privado se elimina con el cierre administrativo existente.
- Rutas `GET/POST /api/admin/wiki/synchronization`, sesión administrativa, Origin confiable en POST y `private, no-store`. No exponer credenciales, conexiones, nombres de colecciones ni huellas internas. Esperar la sincronización y verificar de nuevo su estado; prevenir duplicados con el mismo bloqueo usado por terminal y HTTP 409. Sanitizar fallos antes de responder o pasarlos al logger global.
- Habilitar solo en el API local mediante `WIKI_LOCAL_AI_ENABLED=true`; verificar archivos privados de development y conexión idéntica entre API e ingesta. En Vercel/production siempre deshabilitado, aun con la variable presente, hasta acordar alojamiento real. No convertir el bloqueo local en un supuesto bloqueo distribuido ni lanzar trabajos sin esperar en serverless.
- Comprobado contra Neon development/Qdrant reales: estado actualizado de tres publicaciones/tres fragmentos y sincronización sin cambios que vuelve a devolver actualizado. No editar, publicar ni retirar artículos del propietario para esta comprobación. Ciclo borrador/publicación/retirada, estados de UI, guards, ausencia de filtraciones y concurrencia cubiertos por pruebas aisladas.
- Limitar Vitest a dos procesos conservando aislamiento, todas las aserciones y sus tiempos originales: las ejecuciones con paralelismo automático agotaban esperas; las 115 pruebas de interfaz existentes en esa comprobación pasaron con el límite. No silenciar warnings ni aumentar timeouts para disimular fallos.
- Mantener todos los cambios en local, sin commit, push ni despliegue. Web local en 127.0.0.1:4173 y API en 3001 con sincronización habilitada. Revisión visual completada el 4 de noviembre con la sesión administrativa iniciada por Fernando: estado inicial Actualizado, transición a Sincronizando con botones deshabilitados y retorno a Actualizado; tres artículos publicados, tres indexados y tres fragmentos. GET/POST del flujo con HTTP 200 y consola sin avisos ni errores. No editar ni publicar artículos, ni solicitar o leer la contraseña. El chat público continúa en demostración.
- Validación final de esta entrega: 174 pruebas (116 web, 45 API y 13 infraestructura), tipos, lint sin warnings/errores y compilación correctos. Incluye comprobación HTTP del cliente sin secretos, HTTP 409 por ingestas concurrentes y protección real de las rutas sin sesión.

### Publicación de la ingesta y sincronización — 4 de noviembre de 2026

- Subida autorizada por Fernando y realizada en `d916d9e`. Frontend desplegado; detectado y reproducido el fallo de la segunda compilación TypeScript del API en Vercel: la interfaz global `Response` puede quedar vacía cuando los tipos de Node detectan un entorno worker sin declaraciones DOM.
- Validar explícitamente el contrato mínimo de las respuestas HTTP como datos desconocidos, sin depender de esa interfaz ambiental ni desactivar la comprobación de tipos. Conservar restricciones de origen, autenticación, rechazo de redirecciones y errores sin datos privados.
- Añadir una prueba de respuestas inválidas y una compilación de regresión con los mismos tipos ambientales conflictivos, ejecutada tanto en `typecheck` como en `build`. No añadir dependencias, migraciones ni cambios de credenciales.
- Corrección comprobada con 175 pruebas (116 web, 46 API y 13 infraestructura) y los dos entornos de tipos: compilación habitual y reproducción del fallo de Vercel.
- La sincronización de IA continúa habilitada solo en local; producción muestra «Sin configurar» hasta acordar alojamiento para Qdrant y LiteLLM. El chat público sigue en demostración.

### Decisión vigente — RAG en espera del servidor doméstico (4 de noviembre de 2026)

- Decisión explícita de Fernando: mantener WEB y backend API en Vercel, datos base/wiki en Neon y almacenamiento de CV existente, usando los planes gratuitos dentro de sus cuotas. No prometer coste cero ilimitado, contratar un VPS o activar servicios/modelos de pago. Las alternativas de alojamiento del apartado siguiente se conservan como referencia, no como decisiones de contratación.
- Posponer la apertura del RAG y la elección/integración de conversación hasta montar el servidor local dedicado en casa. Reutilizar allí Qdrant, LiteLLM, inferencia de embeddings y worker. Mantener los guardarraíles locales y el estado «Sin configurar» de producción; no exponer la infraestructura local actual a visitantes.
- System One sigue como ampliación futura a evaluar: Jev u otro modelo decisional, sin proveedor elegido. Separar clasificación, recuperación y generación, y mantener las políticas de fuentes y abstención incluso en conversación general.
- Mientras el chat está en standby, conservar la mascota, preguntas frecuentes y respuestas de demostración. Sustituir el aviso antiguo por un icono de advertencia, «Chatbot en proceso» y tag «+ información». Al pulsar, abrir un modal retro que explique el estado real, wiki publicada/Neon, RAG/Qdrant, LiteLLM, posible System One y dependencia del servidor doméstico, sin presentar capacidades futuras como activas ni fijar una fecha.
- Interacción del aviso: tag accesible por teclado y táctil, ayuda breve al hover sin abrir un modal ni robar foco automáticamente, detalle en la capa superior del navegador para no recortarse por el scroll del chat, contenido con scroll propio y tamaño acotado a la pantalla. Cerrar con botón/«Entendido» o Escape sin cerrar el chat; devolver foco al tag. Estado únicamente en memoria y destrucción al cerrar el chat/sesión.
- Preparación doméstica pendiente: confirmar CPU/RAM/SSD, red estable y funcionamiento sin suspensión; valorar túnel saliente y autenticación servidor a servidor sin abrir Qdrant/Ollama al público, aislamiento de red doméstica, reinicio automático, copias externas y monitorización. Elegir dominio/proveedor de túnel y revisar condiciones antes de configurar. Si cae la IA, portfolio/CV/Ayuda deben seguir operativos con un mensaje de indisponibilidad y tiempos de espera acotados.
- Al retomar: (1) preparar y verificar servidor y conexión segura; (2) adaptar configuración de producción y trabajos durables; (3) elegir y evaluar conversación; (4) probar ingesta/RAG con fuentes y límites; (5) evaluar System One y conversación general; (6) activar gradualmente tras revisión del propietario. Esta decisión prevalece sobre los pasos anteriores que proponían conectar el chat de inmediato.
- Alcance de esta entrega: UI informativa y documentación. Sin nuevas consultas a modelos, conexiones remotas, cambios en BD/credenciales, contrataciones ni despliegue. Revisar en local antes de solicitar publicación.
- Validación: 179 pruebas (120 web, 46 API y 13 infraestructura) y tipos correctos. Chromium aislado: modal nativo por encima del chat, foco inicial y restauración, Escape sin cerrar la conversación ni perder el borrador, escritorio 1280×800 y móvil 390×640 con scroll propio sin desbordamiento horizontal; cero peticiones adicionales al abrir/cerrar información y consola sin warnings/errores. Backend local arrancado con la sincronización de IA deshabilitada, sin modificar sus archivos privados.

### IA en producción — preparación pendiente (4 de noviembre de 2026)

- Mantener frontend y API Fastify en Vercel, contenido editorial y fuente de verdad en Neon y PDF en Blob. Qdrant es un índice reconstruible, no sustituye a Neon. El alojamiento de IA, proveedor y presupuesto siguen pendientes de aprobación; este apartado no autoriza contrataciones ni consumo.
- Distinguir cinco piezas: Qdrant, gateway LiteLLM, inferencia de embeddings, inferencia de conversación y proceso de ingesta. LiteLLM no ejecuta los pesos por sí solo. Conservar configuración independiente para embeddings, conversación y posible modelo decisional.
- Opción de servidor propio: VPS europeo con Docker para Qdrant, LiteLLM, Ollama de embeddings y worker de ingesta. Estimación inicial para evaluar: 4 vCPU/8 GB de RAM, no mínimo garantizado ni dimensionamiento validado; medir memoria, tiempos de embeddings y concurrencia antes de contratar. Presupuestar disco persistente, tráfico, copias, impuestos y mantenimiento. Conversación inicialmente mediante API para no depender de una GPU propia; no garantizar que un LLM conversacional local sea viable con esos recursos.
- Alternativa gestionada: Qdrant Cloud y LiteLLM en Railway u otro host de contenedores, con embeddings/conversación mediante proveedores compatibles o inferencia alojada aparte. Comparar coste total y mantenimiento, no solo el precio de entrada. A fecha de consulta, Railway Hobby parte de 5 USD/mes de consumo mínimo e incluye ese crédito; los recursos adicionales se cobran, no es una tarifa plana para todo el sistema.
- Qdrant Cloud gratuito como opción de evaluación: 1 GB RAM, 0,5 vCPU, 4 GB disco, un nodo; orientado a pruebas, suspensión tras una semana sin uso y eliminación tras cuatro semanas de inactividad si no se reactiva. No asumir disponibilidad de producción ni SLA. Revisar condiciones y costes de nuevo al decidir.
- Si se aloja Qdrant en el VPS, usar volumen persistente, snapshots, copia externa y prueba de restauración; elegir explícitamente los objetivos de recuperación y la disponibilidad aceptable. Definir retención de candidatos/índices anteriores y limpieza segura, sin borrar colecciones activas ni datos ajenos. Versionar imágenes verificadas y planificar actualizaciones y reversión.
- Evaluar ubicación de API, Neon, Qdrant y proveedores de modelos para latencia y residencia de datos. Las Functions actuales no son un disco persistente para Qdrant; no trasladar los volúmenes de Compose a `/tmp` ni tratar el contenedor local como un despliegue listo para Vercel.
- Seleccionar proveedor/modelo de conversación, cuotas y licencia; mantener la evaluación de opciones gratuitas y modelos de origen chino ya recogida en el roadmap. Las suscripciones personales de chat no se presuponen una API pública gratuita. Cuotas gratuitas, modelos abiertos y coste de infraestructura son conceptos distintos.
- Preservar exactamente el perfil de embeddings entre ingesta y consultas: modelo/pesos, revisión o digest, cuantización, preprocesado, instrucción de consulta, normalización, 1024 dimensiones y coseno. Si cambia cualquiera de los componentes que alteran el espacio vectorial, reconstruir y validar el índice; no mezclar vectores incompatibles por coincidir en dimensiones.
- Decidir si LiteLLM seguirá con configuración estática o usará persistencia para claves virtuales, presupuestos y métricas. Si necesita PostgreSQL propio, usar base/credenciales aisladas del contenido de NandOS y migraciones explícitas. No añadir Redis por defecto: justificarlo por coordinación, límites o escalado; no prometer límites globales basados solo en memoria.
- Crear configuración y adaptadores de producción distintos a los guards locales: endpoints HTTPS permitidos, secretos en servidor, timeouts y permisos mínimos. No eliminar la protección de development ni habilitar producción simplemente activando `WIKI_LOCAL_AI_ENABLED`. Mantener entornos, claves, trabajos y alias de Qdrant separados; ningún fallback hacia localhost o development.
- Red privada entre contenedores; Qdrant/Ollama y la administración de LiteLLM no se exponen libremente. Para acceso desde Vercel, TLS y autenticación servidor a servidor, separación de credenciales de consulta e ingesta y rotación prevista. Ninguna master key o clave de proveedor en React, localStorage, URLs, Git o registros. Verificar versiones e integridad de imágenes antes de exponerlas.
- Convertir «Sincronizar wiki» en una solicitud autenticada a un trabajo durable: persistir ID, estado, huella, inicio/fin y resultado seguro; impedir duplicados mediante coordinación compartida. El bloqueo por archivo actual es solo local. Diseñar exclusión con vencimiento/recuperación y protección frente a workers antiguos que intenten activar un índice tras perder el bloqueo. No iniciar tareas sin esperar ni seguimiento dentro de una Function.
- Worker con reintentos acotados y espera progresiva, ejecución idempotente, cancelación/recuperación de trabajos interrumpidos y seguimiento desde el panel. Ingerir solo publicaciones; volver a validar el corpus antes del cambio atómico de alias. Comprobar artículos retirados/revisiones vigentes también al consultar, sin responder con datos obsoletos si una sincronización falla.
- Chat público únicamente a través de nuestra API: límites compartidos de peticiones/concurrencia, tamaño de entrada, contexto y salida; presupuesto y corte de emergencia que contemple clasificador, embeddings y generación. No basar el corte exclusivamente en métricas tardías del proveedor. Mantener administración y permisos fuera del alcance del chat; sin herramientas de escritura o ejecución en esta versión.
- Observabilidad sin conversaciones completas por defecto ni secretos: latencia, errores, tokens/coste, ruta elegida y revisión del índice con retención definida. Health checks, alertas de servicio/presupuesto, logs redactados y estados de UI honestos. Definir qué datos salen a proveedores y evitar incluir borradores, sesiones o información administrativa.
- Criterios de aceptación: ingesta/consulta reales de la wiki publicada de producción, respuestas con fuentes válidas, exclusión de borradores/retiradas, concurrencia y recuperación tras reinicio, restauración de snapshot, aislamiento de entornos, autorización, límites y respuesta degradada si falla un proveedor. Pruebas en español y carga representativa; cero warnings/errores de lint, tipos y compilación.
- Secuencia: (1) acordar presupuesto, alojamiento y modelos; (2) preparar configuración segura y servicios aislados; (3) implementar worker y estado persistente; (4) validar ingesta/recuperación; (5) conectar y evaluar el chat y sus fuentes; (6) activar gradualmente con monitorización y reversión. Mantener el chat de demostración y producción «Sin configurar» hasta superar estas comprobaciones; un rollback no debe borrar la wiki ni sus publicaciones.
- Referencias oficiales consultadas el 4 de noviembre de 2026: [Qdrant Cloud](https://qdrant.tech/documentation/cloud/create-cluster/), [despliegue de LiteLLM](https://docs.litellm.ai/docs/proxy/deploy), [operación de LiteLLM](https://docs.litellm.ai/docs/proxy/prod), [precios de Railway](https://railway.com/pricing) y [runtimes de Vercel](https://vercel.com/docs/functions/runtimes). Revalidar disponibilidad, límites y precios antes de contratar.

### Enrutamiento de nandBot — evaluar System One / Jev (propuesta del propietario)

- Evaluar un modelo decisional de tipo System One, como Jev, para distinguir consultas sobre Fernando/NandOS de conversación general. Es una propuesta de evaluación, no una elección de proveedor ni una integración implementada. Mantener LiteLLM y Qdrant; no migrar a otro gateway o SDK para esta evaluación.
- Jev devuelve decisiones tipadas y distribuciones de probabilidad, no redacta la respuesta del chat. La documentación actual de LiteLLM contempla TypeSafe Jev mediante `/v1/decisions` y `/v1/systemone`; verificar el soporte real en nuestra imagen fijada y hacer una prueba de contrato antes de usarlo. Revisar acceso, precio, privacidad, retención, región y límites; no presuponer que es gratuito, autoalojable o que ahorra costes en nuestro volumen.
- Puerto de dominio propuesto `IntentRouter`, separado de recuperación y generación, con adaptadores intercambiables. Evaluar Jev frente a una referencia sencilla (reglas y/o clasificador pequeño con salida estructurada), sin acoplar decisiones de producto al nombre de un proveedor. Dejar versión/configuración del router identificables y permitir desactivar conversación general desde administración.
- Flujo propuesto: mensaje y contexto mínimo necesario → validación/política del backend → clasificador → `wiki`, `general` o `clarify`. Los límites y las restricciones de seguridad se aplican a todas las rutas y no dependen de que un modelo clasifique correctamente; la decisión no otorga permisos, ejecuta herramientas ni elige URLs arbitrarias.
- Ruta `wiki`: dudas sobre Fernando, CV, contacto, experiencia, proyectos, aplicaciones y funcionamiento de NandOS → Qdrant sobre publicaciones vigentes → evidencia suficiente → LLM que redacta con fuentes verificables. Tanto esta ruta como la general pueden usar el mismo modelo de conversación con instrucciones y contexto distintos; no son necesariamente dos LLM diferentes.
- Si no hay evidencia, la recuperación falla o se retira un artículo, explicar la limitación y ofrecer Ayuda/contacto o pedir precisión. Nunca convertir «no lo encuentro en la wiki» en una respuesta libre que invente datos personales, experiencia o funcionalidades. Esta restricción también se aplica si el router se equivoca o el usuario intenta forzar el modo general.
- Ruta `general`: preguntas generales y charla informal dentro de límites configurados, sin fingir que proceden de la wiki ni citar fuentes inexistentes. Señalar visualmente la diferencia entre respuesta basada en la wiki y conocimiento general. Sin navegación web ni garantía de datos actuales mientras esas capacidades no se implementen y autoricen.
- Ruta `clarify`: ambigüedad, preguntas mixtas o seguimiento insuficiente → aclaración breve o tratamiento conservador centrado en la wiki, sin descartar partes de la pregunta. Incluir contexto limitado para resolver referencias como «¿y su experiencia?»; no enviar toda la conversación ni datos administrativos al clasificador.
- Umbrales por ruta basados en evaluación en español, no una cifra arbitraria. Distinguir `confidence`, probabilidad estimada y relevancia de recuperación: no son equivalentes ni garantías de corrección, y la similitud coseno no demuestra evidencia suficiente. Validar esquema y rutas permitidas; timeout, error o salida inválida implican una respuesta/aclaración conservadora, nunca acceso general ilimitado. No usar el router como única defensa ante prompt injection.
- Pruebas y métricas antes de adoptarlo: CV/contacto, consultas generales, preguntas mixtas, contexto conversacional, idiomas y errores ortográficos, falta de documentación, retiradas, intentos de cambiar instrucciones y caídas de servicios. Medir especialmente preguntas personales mal enviadas a modo general, precisión por ruta, fuentes, abstenciones, latencia p50/p95 y coste total de clasificar + embeddings + generar. Comparar con la referencia sin Jev; no asumir mejoras de velocidad/precio por marketing.
- Introducir primero el router en una evaluación local, opcionalmente en modo sombra sin afectar respuestas; solicitudes reales a un proveedor solo con autorización y datos públicos/sintéticos. Proteger primero el RAG con fuentes y después habilitar charla general bajo límites. No retrasar el RAG básico por esta decisión opcional ni contratar servicios en esta entrega documental.
- Referencias oficiales consultadas el 4 de noviembre de 2026: [introducción de TypeSafe](https://docs.typesafe.ai/introduction), [probabilidades y confianza](https://docs.typesafe.ai/confidence) y [modelos decisionales en LiteLLM](https://docs.litellm.ai/docs/decisions/). La compatibilidad documentada no sustituye la prueba de nuestra versión desplegada.

### Wiki — primera revisión local (31 de octubre de 2026)

- Decisión del propietario: validar primero el editor con datos locales de prueba; no conectar ni modificar Neon en esta iteración.
- Sección «Wiki de nandBot» en administración, carga diferida, editor Markdown seguro con vista previa dividida, barra de formato, categorías, búsqueda y filtros borrador/publicado.
- Guardar borrador no cambia la versión publicada. Publicación explícita y retirada reversible que conserva el borrador. Se exige guardar antes de publicar. Tras revisión se retiran los botones de previsualización de versiones: la vista previa siempre muestra el borrador.
- Avisos al descartar cambios, cambiar de sección, salir o recargar; conflictos de revisión conservan el texto local en lugar de sobrescribirlo.
- Laboratorio solo en desarrollo: `/?wiki=1`, sin autenticación porque usa exclusivamente memoria aislada, sin datos privados ni acceso al backend. Se reinicia al recargar y no usa localStorage para contenidos editoriales.
- 37 artículos iniciales cubren todos los elementos y submenús de Start y cada aplicación registrada, además de escritorio, ventanas, configuración, CV, contacto y nandBot. Importación idempotente, solo como borradores y sin sobrescribir artículos existentes.
- Preparados puerto de repositorio, casos de uso de wiki y adaptador Neon/Drizzle; tabla `wiki_articles` independiente del portfolio. Rutas administrativas con las mismas comprobaciones de sesión/Origin y `no-store`. Consulta pública únicamente de versiones publicadas, para futura ingesta.
- Migración `0001_wiki_articles.sql` generada pero no aplicada. Próximo paso tras validación: persistir y verificar en una rama de desarrollo de Neon. Después ingesta/Qdrant/modelos/LiteLLM, sincronizando publicaciones y retiradas; sin conectar aún el chat a IA.
- Todo permanece local hasta la validación del propietario; sin commit, push ni despliegue en esta iteración.

### Conexión de wiki a Neon — desarrollo

- Editor validado por el propietario; ya integrado en «Wiki de nandBot» del panel real, con selector de categorías existentes y creación de nuevas al guardar el artículo.
- Elegida una rama de desarrollo para no afectar producción. Creada `development` (`br-floral-frog-b90yscar`) en `nandos-db` (`shy-truth-31517067`), derivada de `main`, sin borrado automático.
- Backend local vinculado al proyecto Vercel existente mediante configuración ignorada por Git. Configurado `apps/api/.env` privado, con origen local `http://127.0.0.1:4173`; conexión renovada de development validada sin mostrar secretos.
- Aplicada exclusivamente `0001_wiki_articles.sql` en development, tras verificar endpoint e historial inicial. Prueba contra Neon superada: creación/lectura persistente, publicación, edición independiente del borrador, conflicto y retirada. Eliminado únicamente el artículo temporal de prueba.
- Precargados 37 artículos iniciales en Neon development, todos como borradores, sin versiones públicas. Backend local arrancado y proxy de frontend verificado: la cuenta administrativa copiada existe (`configured: true`, `canSetup: false`). Revisión visual con login real pendiente del propietario.
- Verificación opt-in `test:wiki-db`, limitada a un hostname explícito de desarrollo, con limpieza de su propio artículo temporal. No modifica artículos existentes ni forma parte de `pnpm test`.
- No crear otra cuenta de administrador, cambiar contraseñas, publicar artículos o desplegar automáticamente en producción. Validar acceso real, guardado y recarga antes de dar la conexión por terminada.

### Publicación de la wiki — producción

- Autorizada la subida al repositorio y publicación del editor en administración.
- Aplicada en `main` únicamente la migración aditiva `0001_wiki_articles.sql`, en una transacción y verificando primero el historial de Drizzle. Confirmados dos registros de migración, tabla de wiki disponible y conservación de la cuenta y documento de portfolio existentes.
- Los 37 artículos iniciales se importan desde «Cargar documentación inicial» como borradores, sin sobrescribir contenido. Publicar un artículo sigue siendo una acción editorial explícita; Qdrant, LiteLLM y el chat RAG no se activan en esta entrega.

### Ayuda como lector público de la wiki

- Implementado en local Start > Ayuda: ventana de «Ayuda de NandOS» con presentación de la wiki, selección de sección/artículo y lectura de Markdown seguro. Carga diferida del lector para no cargar el renderizador en el arranque del escritorio.
- Ajuste visual solicitado: eliminar «¿Por dónde empezamos?», su explicación y las tarjetas de artículos. La navegación se realiza exclusivamente mediante los selectores; mantener presentación, Inicio, Actualizar y lectura Markdown.
- Ajuste de tamaño: Ayuda usa 420 px en la presentación y hasta 600 px al leer, limitada al escritorio visible por encima de la barra de tareas. Recolocar posiciones antiguas fuera de pantalla y mantener el maximizado. El artículo tiene scroll vertical propio y el foco de la ventana no desplaza el escritorio.
- Consultar únicamente las instantáneas de `GET /api/wiki/articles`, separadas del caché administrativo. Sin borradores ni semillas como alternativa, con estados de carga, vacío y error, reintento y actualización de publicaciones/retiradas. No añadir edición para visitantes ni activar RAG en esta iteración.
- Reutilizar el marco de ventanas para movimiento, tamaño, maximizado, minimizado, restauración y cierre. Diseño compatible con los temas y vista móvil.
- Actualizar la documentación inicial de Start y añadir guía de Ayuda sin cambiar IDs ya importados. La importación idempotente no sobrescribe artículos existentes; revisar esos textos en administración antes de publicarlos.
- Validación conjunta de la entrega: 124 pruebas (108 web y 16 API). Comprobados en navegador portada compacta, expansión al leer, scroll independiente del artículo, límite por encima de la barra de tareas en pantalla baja, Markdown, minimizado/restauración, maximizado y disposición móvil. Sin cambios editoriales ni publicaciones en la BD. Revisado en local y autorizado por el propietario para subir al repositorio el 1 de noviembre de 2026.

### Reinicio de ventanas de Invitado

- Recargar la página y volver a entrar como Invitado debe mostrar el escritorio sin ventanas, también si estaban minimizadas. Reiniciar el estado de ventanas al entrar, igual que tras Log off.
- Mantener solo posiciones de iconos, carpetas del visitante y papelera en la persistencia del shell; el tema conserva su almacenamiento independiente. Migración v5 y lectura con lista explícita de preferencias para ignorar también ventanas almacenadas por versiones anteriores, sin borrar todo el almacenamiento local.
- Validado en pruebas de persistencia y en navegador: abrir Proyectos, recargar, volver a entrar como Invitado y comprobar que no quedan ventanas abiertas ni minimizadas, conservando los datos del escritorio.

### Calidad: cero avisos de lint

- Eliminar la variable no utilizada del manejo de errores del asistente, sin alterar los mensajes ni la cancelación de peticiones.
- Web y API ejecutan `oxlint --deny-warnings`; sus compilaciones pasan primero ese control. No silenciar warnings, desactivar reglas ni ocultar deprecaciones.
- El proxy usa `URLSearchParams` directamente en lugar de `request.query`, evitando el parser auxiliar del runtime y rechazando rutas reescritas duplicadas. Conservar cuerpos de petición y cookies.
- Validación local: cero avisos de lint, tipos y compilación correctos, 126 pruebas (110 web y 16 API), también con deprecaciones configuradas como errores durante las pruebas. Comprobado por separado que un warning de muestra hace fallar el control de calidad. Pendiente subir esta corrección y confirmar los nuevos logs de Vercel; los registros de despliegues anteriores no se modifican.

### Seguridad de administración

- Incidencia de credenciales de BD (31 de octubre): se compartió una conexión privada en la conversación. El propietario renovó las credenciales; development quedó validado con `.env` y las variables gestionadas de Neon se renovaron en Vercel. Un redeploy de `nandos-api` con el mismo commit `6db1eb9` restableció producción: consultas reales de administración y portfolio verificadas con HTTP 200, tanto directamente como a través del proxy web. No registrar el valor expuesto ni el nuevo en documentos, comandos, logs o Git. No usar la conexión de development para producción.

- Refuerzo implementado en el repositorio y verificado con PostgreSQL temporal. El proxy y el API exigen HTTPS para administración en Vercel. Las escrituras conservan la comprobación de Origin y las respuestas privadas usan `no-store`. Los registros excluyen cuerpos, consultas y secretos de administración.
- Las contraseñas se derivan en servidor con scrypt `N=131072, r=8, p=1`. Los hashes anteriores se verifican y actualizan al iniciar sesión correctamente. Las contraseñas nuevas tienen un mínimo de 15 caracteres.
- Neon comparte los límites de inicio de sesión, alta inicial y cambios de credenciales entre instancias. Se conserva también el límite por instancia en alta y login.
- Las cookies de producción usan `HttpOnly`, `Secure` y `SameSite=Lax`. El servidor aplica 12 horas de duración máxima y 30 minutos de inactividad. La consulta periódica de sincronización de la wiki no cuenta como actividad.
- La migración 0002 está aplicada y registrada en Neon development. Para activar el refuerzo en producción, aplicar la misma migración en Neon main antes de desplegar el API y verificar el acceso real a través del dominio de NandOS. Las sesiones anteriores sin actividad registrada se evalúan desde su creación y pueden pedir un nuevo inicio de sesión.
- Segundo factor evaluado como ampliación. Para la cuenta única de administración, las passkeys son la opción preferida si se define también cómo recuperar el acceso y cómo registrar una segunda llave. La autenticación actual permite una contraseña larga y única guardada en un gestor.

### Laboratorio local de la mascota (SVG + React)

- Mascota original: miniordenador retro con teclado integrado, sin brazos ni piernas. Referencias: Commodore y expresiones de troko.vercel.app; conservar identidad propia.
- Conservar como original `apps/web/public/mascot/nandos-mascota.riv` (artboard `RetroPC`, máquina `State Machine 1`, controles `isListening`, `isThinking`, `answerReady`). No modificar el archivo ni ocultar el splash de sus exportaciones gratuitas.
- Reproducir el diseño propio mediante `SvgMascot`: SVG inline con animaciones nativas del navegador, sin runtime Rive, WASM, WebGL, archivos externos ni pantalla de carga. Esta es la implementación activa para evitar el splash y la dependencia del reproductor.
- Respiración independiente de la expresión. Puerto del avatar: `select('idle' | 'listening' | 'thinking')` y `answer()` para un gesto de respuesta de una sola ejecución con regreso automático a reposo. Un nuevo disparo reinicia el gesto, sin reiniciar la respiración.
- Laboratorio opt-in solo en desarrollo: abrir `/?mascot=1` y entrar como invitado. Permite probar estados y pausa; tamaño pequeño fijo (200 px), sin selector de tamaño ni fondo de contraste. No conecta con IA, API ni BD.
- Carga diferida del laboratorio, pausa con pestaña oculta y movimiento reducido; las pausas congelan también la respuesta. Ocultar el laboratorio cancela las animaciones y libera sus recursos. Mantener una versión estática accesible si el navegador no admite Web Animations.
- Validar el retorno automático de «Respuesta», tamaño y legibilidad antes de integrar el chat o desplegar. Sin publicación ni subida al repositorio en esta iteración.
- La prueba Rive original validó los cuatro estados y la transparencia reexportada por el propietario. La versión SVG conserva geometría, colores, teclado y tiempos de esa mascota; sin fondos añadidos ni cambios a los themes del sistema.

### Opciones de modelos — decisión pendiente

- Evaluar OpenAI y Anthropic mediante sus API, comprobando posibles créditos incluidos en la suscripción del propietario. No asumir que la cuota del chat personal puede alimentar un chatbot público.
- Añadir como alternativa modelos de origen chino: estudiar ofertas de API con cuota gratuita y modelos de pesos abiertos autoalojados. No se ha elegido todavía un modelo ni un proveedor.
- Diferenciar cuota gratuita de API, licencia de pesos y coste de ejecución: un modelo descargable sin coste no implica infraestructura o inferencia gratuitas.
- Antes de elegir, verificar disponibilidad y límites actuales, autorización para uso en una web pública, privacidad y tratamiento de datos, licencia, compatibilidad con LiteLLM y calidad en español para nuestro RAG.
- Comparar por separado las alternativas de conversación y embeddings; validar con preguntas representativas de la wiki. Cambiar el modelo de embeddings requerirá reconstruir el índice correspondiente.
- No contratar servicios ni activar consumo de pago hasta acordar proveedor y presupuesto.
