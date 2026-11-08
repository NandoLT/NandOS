import type { WikiContent } from './wiki.js'

// Append new guides/apps to their respective lists: do not reorder IDs already imported.
// Separate ranges keep app IDs stable when new guides are appended.
const guides: Array<[string, string, string]> = [
  ['Bienvenido a NandOS', 'Primeros pasos', `NandOS es el portfolio interactivo de Fernando López Trejo, presentado como un escritorio retro. No es un sistema operativo real ni da acceso a los archivos de tu ordenador.

Entra como Invitado para explorar la experiencia. Usa Start para encontrar información profesional, documentos, configuración y aplicaciones. Las utilidades deshabilitadas son propuestas futuras, no funciones disponibles.

Esta documentación es una base editorial: revisar y publicar cada artículo antes de usarlo como conocimiento del asistente.`],
  ['Inicio, login y sesión de Invitado', 'Primeros pasos', `Al entrar se muestra un arranque retro y una pantalla de acceso. El acceso de Invitado es una simulación visual; no protege datos privados. La contraseña de demostración es 12345.

El acceso de administración es independiente y requiere credenciales reales. Nunca incluyas contraseñas, tokens ni información privada en artículos destinados a publicarse.`],
  ['Start: menú principal', 'Menú Start', `Pulsa Start en la barra de tareas. Al abrirse no hay ningún submenú seleccionado por defecto.

- **Programas:** información profesional y aplicaciones.
- **Documentos:** Mis documentos, Este equipo y CV en español o inglés.
- **Configuración:** panel de ajustes, Apariencia y temas, y Sistema (próximamente).
- **Buscar:** Archivos o carpetas… y En Internet… (próximamente).
- **Ayuda:** abre la wiki pública, con secciones y artículos publicados para leer.
- **Ejecutar…:** deshabilitado por ahora.
- **Log off Invitado:** volver al acceso.
- **Apagar:** finalizar la experiencia con una animación.

Los submenús se colocan donde hay espacio. Las funciones futuras muestran un aviso al pasar el puntero o recibir foco.`],
  ['Start > Programas', 'Menú Start', `Contiene About Me, File Explorer, Papelera de reciclaje, Experiencia, Proyectos, Habilidades, CV y Contacto.

También muestra Terminal, Writer, Paint, Task Manager, Calculadora, Nando Browser, Mail, Media Player, Calendar, Code Editor y Buscaminas como aplicaciones futuras deshabilitadas. Su aparición en el menú no implica que ya se puedan ejecutar.

Configuración tiene su propia sección en Start. Consulta el artículo individual de cada aplicación para conocer su propósito.`],
  ['Start > Documentos', 'Menú Start', `Mis documentos y Este equipo abren File Explorer, el explorador virtual de NandOS; no leen tu disco real.

CV (Español) y CV (English) abren el PDF correspondiente en una pestaña nueva. Si el navegador bloquea la apertura, permite ventanas emergentes para este sitio. Los PDF y sus versiones se gestionan desde administración.`],
  ['Start > Configuración y Apariencia', 'Menú Start', `Configuración y Apariencia y temas abren el panel de ajustes. La sección operativa es Apariencia: elige un tema y el escritorio cambia al instante.

Sistema está deshabilitado. En el panel también aparece Accesibilidad como opción futura; no promete ajustes operativos todavía. El tema elegido se guarda en este navegador, no cambia el aspecto para otros visitantes.`],
  ['Start > Buscar, Ayuda y Ejecutar', 'Menú Start', `Buscar contiene Archivos o carpetas… y En Internet…. Ambas opciones están deshabilitadas. La segunda está asociada a la futura aplicación Nando Browser.

Ayuda abre una ventana con la presentación de la wiki, un selector de sección y otro de artículo. Muestra el Markdown formateado de las versiones publicadas; nunca los borradores. Inicio vuelve a la presentación y Actualizar consulta la documentación de nuevo.

Ejecutar… sigue siendo una opción futura. También puedes abrir nandBot desde el acceso de dudas situado abajo a la derecha. No hay ejecución de comandos reales del equipo.`],
  ['Log off Invitado y Apagar', 'Sesión', `Log off Invitado cierra la sesión visual y vuelve al login. Al entrar de nuevo, nandBot empieza oculto y aparece otra vez el botón de dudas; no se recupera una conversación anterior.

Apagar muestra una secuencia retro de parada de servicios. El navegador puede impedir que la web cierre una pestaña abierta manualmente; en ese caso ciérrala tú. Ninguna de estas acciones apaga tu equipo real.`],
  ['Escritorio, iconos y menú contextual', 'Escritorio y ventanas', `En escritorio hay accesos a información profesional, Este equipo, CV_Fernando_Lopez y Papelera de reciclaje, entre otros accesos del sistema.

- Clic izquierdo simple: seleccionar.
- Mantener pulsado y arrastrar: mover un icono; al soltar encaja en una rejilla para mantener la alineación.
- Doble clic: abrir el elemento.
- Clic derecho: mostrar las acciones disponibles.

La papelera también se puede mover. Las interacciones táctiles se adaptan al dispositivo. El escritorio es virtual y sus elementos no son archivos de tu disco.`],
  ['Ventanas y barra de tareas', 'Escritorio y ventanas', `Arrastra la barra de título para mover una ventana. Usa los controles para minimizar, maximizar/restaurar y cerrar. Arrastra sus bordes o la esquina de redimensionado para cambiar su tamaño cuando no esté maximizada.

Una ventana minimizada sigue disponible en la barra de tareas: pulsa su botón para recuperarla. La ventana activa se coloca delante. El contenido puede tener su propio desplazamiento sin invadir la esquina de redimensionado.`],
  ['Carpetas de usuario y Papelera de reciclaje', 'Escritorio y ventanas', `Desde el menú contextual del escritorio puedes crear carpetas de usuario. Los elementos creados por el visitante se pueden enviar a la Papelera de reciclaje y restaurar desde ella. Vaciar la papelera elimina los elementos de usuario que contiene.

Los accesos y elementos del sistema están protegidos: intentar eliminarlos muestra un aviso de prohibición, aunque puedas moverlos o abrir su menú contextual. No se borran archivos del ordenador real.`],
  ['Temas y preferencias locales', 'Configuración', `En Start > Configuración > Apariencia y temas puedes alternar entre los temas disponibles, entre ellos Classic 95 y Modern Desktop. Cambia el aspecto, no el contenido profesional.

El navegador conserva preferencias de interacción mediante almacenamiento local. La información de Fernando y los artículos de la wiki pertenecen a la base de datos del sitio, no a ese almacenamiento. Borrar los datos del navegador puede reiniciar tus preferencias.`],
  ['Volumen, red y reloj', 'Configuración', `La zona de estado de la barra de tareas muestra volumen, red y hora. Es parte de la simulación: no controla el volumen ni la red de tu sistema operativo.

La edición de hora y los controles detallados de volumen/red son ampliaciones futuras. No interpretes los iconos como permisos concedidos al sitio sobre tu ordenador.`],
  ['CV: consultar y descargar', 'Información profesional', `El acceso PDF del escritorio se llama CV_Fernando_Lopez. Puedes abrir el CV desde ese acceso, desde Programas > CV o desde Documentos > CV (Español) / CV (English).

El PDF se abre en una pestaña nueva. El visor de tu navegador permite descargarlo. Los enlaces usan la versión pública configurada para cada idioma; subir un documento al panel no lo sustituye públicamente hasta publicar los cambios correspondientes del portfolio.`],
  ['Contacto con Fernando', 'Información profesional', `Abre Start > Programas > Contacto o el acceso de Contacto disponible en el escritorio/explorador.

Los canales públicos de referencia son:
- Correo: [fernando.lopez.dev@hotmail.com](mailto:fernando.lopez.dev@hotmail.com).
- [LinkedIn](https://www.linkedin.com/in/fernandolopeztrejo).
- [GitHub](https://github.com/nandolt).

Ubicación: San Fernando, Cádiz (España). Disponibilidad para remoto. Revisa estos datos antes de publicar el artículo y mantenlos sincronizados con el portfolio.`],
  ['nandBot: abrir el asistente y usar el chat', 'Asistente', `El acceso de dudas está en la esquina inferior derecha. Al pulsarlo aparece el mini PC retro con una animación de caída y rebote; sus botones de acción viajan con él. El botón de bocadillo abre el chat.

El chat presenta a nandBot y ofrece preguntas frecuentes como dónde consultar el CV o cómo contactar con Fernando. Al elegir una pregunta desaparece la presentación y se muestra su respuesta. Las preguntas frecuentes permanecen accesibles abajo; una nueva sustituye la respuesta anterior. El historial acumulado se reserva para conversación libre.

Cerrar y reabrir el chat reinicia su presentación. Recargar la página o salir y volver a entrar reinicia el asistente completo. No hay botón de pausa.

Actualmente las respuestas son locales y guiadas. La conexión a Qdrant, modelos y LiteLLM es una fase posterior; esta wiki no implica que el RAG ya esté activo.`],
  ['Administración, borradores y publicaciones', 'Administración', `El acceso de administrador se encuentra en el login y es distinto de la sesión de Invitado. El panel permite editar los datos del portfolio, gestionar PDF y cambiar credenciales.

La wiki tiene artículos separados por categorías. Guardar borrador conserva una edición privada. Publicar crea la versión pública del artículo. Editar después no altera esa versión hasta volver a publicar. Retirar publicación elimina la versión pública y conserva el borrador.

La carga de documentación inicial solo crea borradores y no sobrescribe artículos ya importados. Solo las versiones publicadas podrán alimentar la futura ingesta; nunca los borradores ni las credenciales.`],
  ['Ayuda: consultar la wiki', 'Menú Start', `Abre Start > Ayuda para consultar la documentación pública de NandOS en una ventana del escritorio. Puedes moverla, minimizarla, maximizarla, redimensionarla y cerrarla como las demás ventanas.

La portada presenta la wiki. Usa los selectores Sección y Artículo para elegir qué leer; no hay un listado adicional de tarjetas. El contenido Markdown se muestra con encabezados, listas, tablas y enlaces. Los enlaces se abren en una pestaña nueva.

Inicio vuelve a la portada. Actualizar vuelve a consultar las versiones publicadas para recoger cambios o retiradas. Si no hay artículos publicados, verás un aviso; los borradores no se muestran como alternativa. Ante un error de conexión, vuelve a intentarlo con Actualizar.

La wiki es de solo lectura para los visitantes. Editar, guardar, publicar o retirar artículos corresponde al panel de administración. No incluyas secretos en contenido publicado: sus versiones son públicas. Este lector no activa el RAG de nandBot.`],
]

// App IDs also provide an explicit coverage contract with the front-end registry.
const apps: Array<[string, string, string, boolean]> = [
  ['about', 'About Me', 'Abre Fernando.exe con la presentación y el perfil profesional público de Fernando. Consulta aquí su titular, resumen y estado profesional actuales.', true],
  ['file-explorer', 'File Explorer', 'Abre el explorador de directorios virtuales de NandOS, no Fernando.exe ni archivos del disco real. Permite navegar hacia las secciones del portfolio y los elementos del escritorio.', true],
  ['recycle-bin', 'Papelera de reciclaje', 'Muestra los elementos de usuario eliminados y las acciones de restauración y vaciado. Los elementos del sistema están protegidos y no se pueden enviar a la papelera.', true],
  ['experience', 'Experiencia', 'Muestra la trayectoria profesional publicada de Fernando, con las entradas, periodos y detalles configurados en administración. No inventes empleos ni fechas que no figuren en su contenido vigente.', true],
  ['projects', 'Proyectos', 'Muestra los proyectos publicados y sus descripciones, tecnologías y enlaces disponibles. Abre esta sección para conocer ejemplos concretos del trabajo de Fernando.', true],
  ['skills', 'Habilidades', 'Presenta las habilidades y tecnologías publicadas, organizadas en los grupos configurados en administración. No atribuye certificaciones ni experiencia no documentadas.', true],
  ['cv-viewer', 'CV', 'Abre el CV público en español en una pestaña nueva. Para inglés usa Start > Documentos > CV (English). El visor del navegador permite descargar el PDF.', true],
  ['contact', 'Contacto', 'Reúne la ubicación, disponibilidad y canales públicos de contacto. Usa los enlaces de correo y redes mostrados en esta sección para contactar con Fernando.', true],
  ['settings', 'Configuración', 'Se encuentra en Start > Configuración. Apariencia permite cambiar el tema local del escritorio. Sistema y Accesibilidad son futuras opciones deshabilitadas.', true],
  ['terminal', 'Terminal', 'Propuesta de terminal simulado con comandos guiados para explorar el portfolio. No ejecutará órdenes del sistema operativo real.', false],
  ['writer', 'Writer', 'Propuesta de editor de texto con estética retro para escribir documentos dentro de la experiencia.', false],
  ['paint', 'Paint', 'Propuesta de lienzo de dibujo retro con herramientas sencillas de pintura.', false],
  ['task-manager', 'Task Manager', 'Propuesta de administrador visual de aplicaciones y ventanas simuladas de NandOS, no de procesos del equipo real.', false],
  ['calculator', 'Calculadora', 'Propuesta de calculadora de escritorio con operaciones básicas.', false],
  ['browser', 'Nando Browser', 'Propuesta de navegador retro dentro de NandOS para explorar contenido y enlaces de la experiencia.', false],
  ['mail', 'Mail', 'Propuesta de aplicación de correo/contacto con interfaz retro. Hoy el contacto se realiza desde la sección Contacto.', false],
  ['media-player', 'Media Player', 'Propuesta de reproductor multimedia con aspecto clásico.', false],
  ['calendar', 'Calendar', 'Propuesta de calendario de escritorio. No implica integración con agendas externas ni reservas disponibles.', false],
  ['code-editor', 'Code Editor', 'Propuesta de editor de código retro para mostrar o explorar ejemplos. No ofrece ejecución de código por ahora.', false],
  ['minesweeper', 'Buscaminas', 'Propuesta de juego clásico de Buscaminas para la experiencia retro.', false],
]

export const WIKI_DOCUMENTED_APP_IDS = apps.map(([id]) => id)
const seedId = (index: number) => `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`
export const INITIAL_WIKI_ARTICLES: Array<{ id: string; draft: WikiContent }> = [
  ...guides.map(([title, category, markdown], index) => ({ id: seedId(index + 1), draft: { title, category, markdown: `# ${title}\n\n${markdown}` } })),
  ...apps.map(([, title, description, available], index) => ({ id: seedId(index + 1001), draft: { title: `Aplicación: ${title}`,
    category: available ? 'Aplicaciones disponibles' : 'Aplicaciones futuras',
    markdown: `# ${title}\n\n**Estado: ${available ? 'disponible' : 'próximamente; deshabilitada'}.**\n\n${description}\n\n${available
      ? 'Acceso: Start > ' + (title === 'Configuración' ? 'Configuración' : `Programas > ${title}`) + '.'
      : 'Figura en Start > Programas como acceso deshabilitado. Al situarte encima aparece el aviso de disponibilidad futura. No hay fecha de lanzamiento confirmada ni se puede abrir todavía.'}` } })),
]
