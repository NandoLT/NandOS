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
- Contacto muestra ubicación, disponibilidad para remoto, teléfono, email, LinkedIn y GitHub; los enlaces usan `mailto:`, `tel:` y las direcciones web correspondientes.
- Volumen, red y reloj tienen controles con tooltips coherentes; sus ajustes funcionales quedan para una iteración posterior.
- “Apagar” reproduce una secuencia de cierre y deja una pantalla final que indica que se puede cerrar la pestaña. Por las restricciones del navegador no detiene el servidor local ni puede cerrar de forma fiable una pestaña abierta por el usuario; el servidor se para desde la terminal que lo inició.
- La animación de inicio queda preparada para pulir más adelante hacia un estilo Linux (servicios) o BIOS/Windows 95.

## Catálogo de aplicaciones

Las aplicaciones se registran en un `App Registry` común para alimentar el escritorio, el menú Start, el explorador y la barra de tareas.

### Aplicaciones funcionales prioritarias

- File Explorer.
- CV Viewer.
- Terminal con comandos como `about`, `projects`, `skills`, `contact`, `download cv` y `neofetch`.
- Settings con themes, sonido, escala y accesibilidad.
- Task Manager mostrando ventanas y aplicaciones reales de la sesión.
- Writer / Notepad para explicar proyectos, principios y forma de trabajo.

### Aplicaciones futuras

- Paint / Pixel Studio.
- Internal Browser.
- Mail / Contact.
- Media Player.
- Calendar / Timeline.
- Calculator.
- Code Editor.
- System Information.
- Minesweeper o Solitaire como easter eggs.

Las aplicaciones futuras aparecerán en el menú con aspecto desactivado. No se utilizará necesariamente el atributo HTML `disabled`, porque debe poder mostrarse información al recibir foco o hover. Se usará `aria-disabled="true"`, se bloqueará la acción y se mostrará un popover:

> Paint estará disponible próximamente.

El popover debe funcionar con hover, teclado y toque en móvil.

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
│   └── api/                  # Fastify, se activa más adelante
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

El backend tendrá directorio reservado, pero no se implementará hasta que exista un caso de uso real. El MVP se centrará en `apps/web`.

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

### Organización del backend futuro

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
- Fastify + TypeScript para `apps/api`, en una fase posterior.
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
- `portfolio-api`: backend Fastify + TypeScript, cuando exista una necesidad real.
- Ambos proyectos compartirán repositorio, paquetes y configuración, pero podrán desplegarse y revertirse de forma independiente.
- Se utilizarán Related Projects o rewrites para conectar previews y evitar URLs de API hardcodeadas.
- Inicialmente solo se desplegará `portfolio-web`.

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

El backend y la base de datos se añadirán cuando haya contenido dinámico, contacto, administración o edición de themes.

### Frontend

- React.
- TypeScript.
- Vite.
- Emotion para tokens y estilos dinámicos.
- Zustand para estado de sesión e interacción.
- TanStack Query únicamente para estado remoto cuando exista API.
- Vitest.
- React Testing Library.
- Playwright.

Arquitectura frontend orientada a módulos y casos de uso, inspirada en hexagonal:

- `domain`: reglas puras, sin React ni APIs del navegador.
- `application`: casos de uso.
- `infrastructure`: localStorage, APIs del navegador y futuro cliente HTTP.
- `ui`: componentes y composición React.

### Backend futuro

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
