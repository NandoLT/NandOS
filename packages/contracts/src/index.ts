export type AppStatus = 'available' | 'coming-soon'

export type AppId =
  | 'file-explorer'
  | 'recycle-bin'
  | 'about'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'cv-viewer'
  | 'settings'
  | 'contact'
  | 'terminal'
  | 'writer'
  | 'paint'
  | 'task-manager'
  | 'calculator'
  | 'browser'
  | 'mail'
  | 'media-player'
  | 'calendar'
  | 'code-editor'
  | 'minesweeper'

export type AppDefinition = {
  id: AppId
  name: string
  status: AppStatus
  description?: string
}

export type PortfolioSectionId = 'experience' | 'projects' | 'skills' | 'contact'

export type ContactChannel = {
  id: string
  label: string
  icon: string
  href: string
  value: string
}

export type CvLanguage = 'es' | 'en'

export type CvDocument = {
  language: CvLanguage
  filename: string
  url: string
  uploadedAt: string | null
}

export type ExperienceEntry = {
  id: string
  title: string
  context: string
  summary: string
  contributions: string[]
}

export type FeaturedProject = {
  id: string
  title: string
  description: string
  technologies: string[]
  details: string
}

export type SkillGroup = {
  id: string
  title: string
  skills: string[]
}

export type PortfolioContent = {
  profile: {
    fullName: string
    headline: string
    summary: string
    status: string
    interface: string
    specialty: string
  }
  sectionIntros: Record<PortfolioSectionId, { eyebrow: string; description: string }>
  experienceEntries: ExperienceEntry[]
  featuredProjects: FeaturedProject[]
  skillGroups: SkillGroup[]
  contact: {
    location: string
    availability: string
    channels: ContactChannel[]
  }
  cvDocuments: Partial<Record<CvLanguage, CvDocument>>
}

/** Public starter content. It seeds the first portfolio document and remains the offline fallback. */
export const DEFAULT_PORTFOLIO_CONTENT: PortfolioContent = {
  profile: {
    fullName: 'Fernando López Trejo',
    headline: 'Frontend Engineer / Technical Contributor',
    summary:
      'Bienvenido a NandOS. Desde este escritorio puedes explorar mi experiencia, proyectos, habilidades y descargar el CV.',
    status: 'Explorando nuevas oportunidades',
    interface: 'React · TypeScript · Product thinking',
    specialty: 'Interfaces y producto con React y TypeScript',
  },
  sectionIntros: {
    experience: {
      eyebrow: 'Contribuciones profesionales',
      description:
        'Trabajo frontend con React y TypeScript, integración de servicios y evolución de flujos de producto.',
    },
    projects: {
      eyebrow: 'Trabajo seleccionado',
      description: 'Algunos problemas de producto y técnicos en los que he contribuido.',
    },
    skills: {
      eyebrow: 'Herramientas y prácticas',
      description: 'Tecnologías y áreas de trabajo reflejadas en mi experiencia y proyectos.',
    },
    contact: {
      eyebrow: 'Hablemos',
      description: 'Estoy explorando oportunidades de Senior Frontend Engineer con foco en React y TypeScript.',
    },
  },
  experienceEntries: [
    {
      id: 'frontend-engineer',
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
      id: 'nivichat',
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
  ],
  featuredProjects: [
    {
      id: 'nivichat',
      title: 'Nivichat / Nivi',
      description:
        'MVP de búsqueda y respuestas fundamentadas con RAG, integrado con la wiki de Nivimu y preparado para referencias documentales por cliente.',
      technologies: ['React', 'TypeScript', 'RAG', 'SSE'],
      details: 'MVP en uso · segunda fase en desarrollo',
    },
    {
      id: 'hotel-budgets',
      title: 'Presupuestos hoteleros y CP-SAT',
      description:
        'Participación en una solución de presupuestación hotelera y en el modelado de restricciones, trasladando un dominio complejo a una experiencia comprensible.',
      technologies: ['Frontend', 'Modelado de restricciones', 'CP-SAT'],
      details: 'Proyecto de producto',
    },
    {
      id: 'offline-clock-in',
      title: 'Fichaje offline',
      description:
        'Trabajo frontend en captura local de fichajes, recuperación de conectividad y sincronización posterior según los contratos del producto.',
      technologies: ['React', 'TypeScript', 'Offline-first', 'Sincronización'],
      details: 'Flujos con y sin conexión',
    },
    {
      id: 'nivi-microservice',
      title: 'Microservicio Nivi',
      description:
        'Servicio TypeScript para recuperación combinada de información, con autorización por cliente y rol, extracción de PDF y respuestas en streaming.',
      technologies: ['Fastify', 'LangGraph', 'Qdrant', 'LiteLLM', 'JWT', 'SSE'],
      details: 'Búsqueda vectorial y léxica',
    },
  ],
  skillGroups: [
    { id: 'frontend', title: 'Frontend', skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'] },
    {
      id: 'integration-architecture',
      title: 'Integración y arquitectura',
      skills: ['APIs REST', 'Contratos de datos', 'Integración frontend', 'Fastify'],
    },
    {
      id: 'ai-search',
      title: 'IA y búsqueda documental',
      skills: ['RAG', 'Embeddings', 'LangGraph', 'Qdrant', 'LiteLLM', 'Extracción de PDF'],
    },
    {
      id: 'quality-flows',
      title: 'Calidad y flujos',
      skills: ['Testing', 'Debugging', 'JWT', 'SSE', 'Fichaje offline', 'Documentación técnica'],
    },
  ],
  contact: {
    location: 'San Fernando, Cádiz (España)',
    availability: 'Disponibilidad para remoto',
    channels: [
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
    ],
  },
  cvDocuments: {
    es: {
      language: 'es',
      filename: 'Fernando_Lopez_Trejo_CV_ES.pdf',
      url: '/cv/Fernando_Lopez_Trejo_CV_ES.pdf',
      uploadedAt: null,
    },
    en: {
      language: 'en',
      filename: 'Fernando_Lopez_Trejo_CV_EN.pdf',
      url: '/cv/Fernando_Lopez_Trejo_CV_EN.pdf',
      uploadedAt: null,
    },
  },
}
