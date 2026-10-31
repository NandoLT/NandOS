import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
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
}

// A full/blocked browser storage must never prevent using the assistant.
const storage = createJSONStorage(() => ({
  getItem(name: string) { try { return localStorage.getItem(name) } catch { return null } },
  setItem(name: string, value: string) { try { localStorage.setItem(name, value) } catch { /* in-memory session remains usable */ } },
  removeItem(name: string) { try { localStorage.removeItem(name) } catch { /* best effort */ } },
}))

export const useAssistantStore = create<AssistantState>()(persist((set) => ({
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
}), {
  name: 'nandos:assistant', version: 2, storage,
  partialize: ({ visible }) => ({ visible }),
  migrate: (persisted) => ({ visible: Boolean(persisted && typeof persisted === 'object' && 'visible' in persisted && persisted.visible === true) }),
  merge: (persisted, current) => {
    const data = persisted && typeof persisted === 'object' ? persisted as Partial<AssistantState> : {}
    return { ...current, visible: data.visible === true, chatOpen: false, messages: [], mode: null }
  },
}))
