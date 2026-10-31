import type { PortfolioContent } from '@nandoos/contracts'

export const assistantActions = ['cv', 'contact', 'experience', 'projects', 'settings', 'about'] as const
export type AssistantAction = typeof assistantActions[number]
export type AssistantReply = { text: string; actions?: AssistantAction[] }
export type ChatMessage = AssistantReply & { id: string; role: 'user' | 'assistant' }
export type QuestionSource = 'faq' | 'conversation'

/** Replace this adapter with the backend RAG client, without coupling the UI to a model. */
export interface AssistantService {
  ask(question: string, content: PortfolioContent, signal: AbortSignal): Promise<AssistantReply>
}

export const suggestedQuestions = [
  '¿Dónde consulto el CV?',
  '¿Cómo me pongo en contacto con Fernando?',
  '¿Qué experiencia tiene?',
  '¿Qué proyectos puedo ver?',
  '¿Cómo funciona NandOS?',
] as const

export const welcomeMessage = '¡Hola! Soy nandBot, tu asistente en NandOS. Estoy aquí para ayudarte a conocer a Fernando y explorar su escritorio. ¿Qué necesitas?'

export const actionLabels: Record<AssistantAction, string> = {
  cv: 'Abrir CV en otra pestaña', contact: 'Abrir Contacto', experience: 'Ver Experiencia',
  projects: 'Ver Proyectos', settings: 'Abrir Configuración', about: 'Conocer a Fernando',
}
