export type PortfolioSectionId = 'experience' | 'projects' | 'skills' | 'contact'

export const experienceEntries = [
  {
    title: 'Frontend Engineer / Technical Contributor',
    context: 'Experiencia técnica',
    summary:
      'Desarrollo y evolución de interfaces con React y TypeScript, integradas con servicios y flujos de negocio reales.',
    contributions: [
      'Participación en decisiones de frontend: separación de responsabilidades, contratos de integración y estados de carga y error.',
      'Colaboración en diagnóstico de incidencias, pruebas, revisión técnica y documentación.',
      'Trabajo en presupuestación hotelera, fichaje offline y productos de búsqueda asistida.',
    ],
  },
  {
    title: 'Nivichat / Nivi',
    context: 'Proyecto profesional · MVP en uso',
    summary:
      'Integración frontend con un microservicio que responde preguntas autenticadas mediante RAG y streaming SSE.',
    contributions: [
      'El MVP consulta la wiki generalista de Nivimu; la segunda fase permite seleccionar documentos de referencia por cliente.',
      'Integración de referencias documentales con el servicio para extracción de texto, vectorización y recuperación contextual.',
      'Trabajo con contratos de autenticación y autorización, recuperación vectorial y léxica, y fuentes PDF/HTTP.',
    ],
  },
] as const

export const featuredProjects = [
  {
    title: 'Nivichat / Nivi',
    description:
      'MVP de búsqueda y respuestas fundamentadas con RAG, integrado con la wiki de Nivimu y preparado para referencias documentales por cliente.',
    technologies: ['React', 'TypeScript', 'RAG', 'SSE'],
    details: 'MVP en uso · segunda fase en desarrollo',
  },
  {
    title: 'Presupuestos hoteleros y CP-SAT',
    description:
      'Participación en una solución de presupuestación hotelera y en el modelado de restricciones, trasladando un dominio complejo a una experiencia comprensible.',
    technologies: ['Frontend', 'Modelado de restricciones', 'CP-SAT'],
    details: 'Proyecto de producto',
  },
  {
    title: 'Fichaje offline',
    description:
      'Trabajo frontend en captura local de fichajes, recuperación de conectividad y sincronización posterior según los contratos del producto.',
    technologies: ['React', 'TypeScript', 'Offline-first', 'Sincronización'],
    details: 'Flujos con y sin conexión',
  },
  {
    title: 'Microservicio Nivi',
    description:
      'Servicio TypeScript para recuperación combinada de información, con autorización por cliente y rol, extracción de PDF y respuestas en streaming.',
    technologies: ['Fastify', 'LangGraph', 'Qdrant', 'LiteLLM', 'JWT', 'SSE'],
    details: 'Búsqueda vectorial y léxica',
  },
] as const

export const skillGroups = [
  {
    title: 'Frontend',
    skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
  },
  {
    title: 'Integración y arquitectura',
    skills: ['APIs REST', 'Contratos de datos', 'Integración frontend', 'Fastify'],
  },
  {
    title: 'IA y búsqueda documental',
    skills: ['RAG', 'Embeddings', 'LangGraph', 'Qdrant', 'LiteLLM', 'Extracción de PDF'],
  },
  {
    title: 'Calidad y flujos',
    skills: ['Testing', 'Debugging', 'JWT', 'SSE', 'Fichaje offline', 'Documentación técnica'],
  },
] as const

export type ContactChannel = {
  id: string
  label: string
  icon: string
  href: string
  value: string
}

export const contactChannels: ContactChannel[] = [
  {
    id: 'email',
    label: 'Email',
    icon: '✉️',
    href: 'mailto:fernando.lopez.dev@hotmail.com',
    value: 'fernando.lopez.dev@hotmail.com',
  },
  {
    id: 'phone',
    label: 'Teléfono',
    icon: '☎️',
    href: 'tel:+34688930344',
    value: '+34 688 930 344',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: 'in',
    href: 'https://linkedin.com/in/fernandolopeztrejo',
    value: 'linkedin.com/in/fernandolopeztrejo',
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: '⌘',
    href: 'https://github.com/nandolt',
    value: 'github.com/nandolt',
  },
]
