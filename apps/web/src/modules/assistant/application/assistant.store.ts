import { create } from 'zustand'
import type { ChatMessage, QuestionSource } from '../domain/conversation'

type AssistantState = {
  visible: boolean
  chatOpen: boolean
  messages: ChatMessage[]
  mode: QuestionSource | null
  show(): void
  hide(): void
  openChat(): void
  closeChat(): void
  beginQuestion(text: string, source: QuestionSource): void
  append(message: Omit<ChatMessage, 'id'>): void
  clear(): void
  reset(): void
}

// Session-only: a page reload never restores the avatar or conversation.
export const useAssistantStore = create<AssistantState>()((set) => ({
  visible: false, chatOpen: false, messages: [], mode: null,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false, chatOpen: false, messages: [], mode: null }),
  openChat: () => set((state) => state.chatOpen ? state : { visible: true, chatOpen: true, messages: [], mode: null }),
  closeChat: () => set({ chatOpen: false, messages: [], mode: null }),
  beginQuestion: (text, source) => set((state) => ({
    mode: source,
    messages: [...(source === 'conversation' && state.mode === source ? state.messages : []),
      { id: crypto.randomUUID(), role: 'user' as const, text }].slice(-40),
  })),
  append: (message) => set((state) => ({ messages: [...state.messages, { ...message, id: crypto.randomUUID() }].slice(-40) })),
  clear: () => set({ messages: [], mode: null }),
  reset: () => {
    set({ visible: false, chatOpen: false, messages: [], mode: null })
    // Retire only our old persisted preferences, never other desktop settings.
    try { localStorage.removeItem('nandos:assistant') } catch { /* Storage may be blocked. */ }
  },
}))
