import type { PortfolioContent } from '@nandoos/contracts'
import type { AssistantReply, AssistantService } from '../domain/conversation'

export function getDemoReply(question: string, content: PortfolioContent): AssistantReply {
  const text = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/\bcv\b|curriculum/.test(text)) return {
    text: 'Encontrarás el CV en el documento CV_Fernando_Lopez del escritorio y en Start → Documentos. También puedes abrirlo desde aquí en una nueva pestaña.', actions: ['cv'],
  }
  if (/contact|correo|email|telefono|linkedin/.test(text)) return {
    text: [`Puedes contactar con ${content.profile.fullName} desde la sección Contacto.`,
      content.contact.location, content.contact.availability,
      ...content.contact.channels.map((channel) => `${channel.label}: ${channel.value}`)].filter(Boolean).join('\n'), actions: ['contact'],
  }
  if (/experiencia|trabaj|trayectoria/.test(text)) return {
    text: content.experienceEntries.length
      ? content.experienceEntries.slice(0, 3).map((entry) => `${entry.title}\n${entry.summary}`).join('\n\n')
      : 'Puedes consultar su trayectoria en Experiencia. Todavía no hay entradas publicadas.', actions: ['experience'],
  }
  if (/proyect|portfolio/.test(text)) return {
    text: content.featuredProjects.length
      ? `En Proyectos encontrarás:\n${content.featuredProjects.slice(0, 4).map((project) => `• ${project.title}: ${project.description}`).join('\n\n')}`
      : 'La sección Proyectos está preparada; todavía no hay proyectos publicados.', actions: ['projects'],
  }
  if (/theme|tema|configur|apariencia/.test(text)) return {
    text: 'Abre Start → Configuración para cambiar el tema visual. Tu elección se guarda solo en este navegador.', actions: ['settings'],
  }
  if (/funciona|nandos|escritorio|menu|ventana/.test(text)) return {
    text: 'NandOS es el portfolio de Fernando convertido en un escritorio interactivo. Abre los iconos con doble clic (un toque en móvil), explora Start y mueve, minimiza o redimensiona las ventanas. Las aplicaciones deshabilitadas están previstas para más adelante. Yo te ayudo a orientarte; en esta demo todavía no consulto una wiki ni una IA.', actions: ['about', 'settings'],
  }
  return { text: 'Esta es una demostración con respuestas locales, no una IA todavía. No tengo una respuesta preparada para esa pregunta. Cuando conectemos la wiki podré consultar su contenido. Por ahora puedes preguntarme por el CV, contacto, experiencia, proyectos o el funcionamiento de NandOS.' }
}

export const demoAssistant: AssistantService = {
  ask(question, content, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException('Consulta cancelada', 'AbortError')); return }
      const cancel = () => {
        window.clearTimeout(timer)
        signal.removeEventListener('abort', cancel)
        reject(new DOMException('Consulta cancelada', 'AbortError'))
      }
      const timer = window.setTimeout(() => {
        signal.removeEventListener('abort', cancel)
        resolve(getDemoReply(question, content))
      }, 700)
      signal.addEventListener('abort', cancel, { once: true })
    })
  },
}
