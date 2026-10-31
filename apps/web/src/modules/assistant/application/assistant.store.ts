import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { assistantActions } from '../domain/conversation'
import type { ChatMessage } from '../domain/conversation'

type AssistantState = {
  visible: boolean
  chatOpen: boolean
  motionPaused: boolean
  messages: ChatMessage[]
  show(): void
  hide(): void
  openChat(): void
  closeChat(): void
  setMotionPaused(paused: boolean): void
  append(message: Omit<ChatMessage, 'id'>): void
  clear(): void
}

function readMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value.slice(-40).flatMap((item): ChatMessage[] => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' ||
      !['user', 'assistant'].includes(item.role) || typeof item.text !== 'string') return []
    const actions = Array.isArray(item.actions)
      ? item.actions.filter((action: unknown) => assistantActions.includes(action as typeof assistantActions[number])).slice(0, 6)
      : []
    return [{ id: item.id.slice(0, 80), role: item.role, text: item.text.slice(0, 4000), ...(actions.length ? { actions } : {}) }]
  })
}

// A full/blocked browser storage must never prevent using the assistant.
const storage = createJSONStorage(() => ({
  getItem(name: string) { try { return localStorage.getItem(name) } catch { return null } },
  setItem(name: string, value: string) { try { localStorage.setItem(name, value) } catch { /* in-memory session remains usable */ } },
  removeItem(name: string) { try { localStorage.removeItem(name) } catch { /* best effort */ } },
}))

export const useAssistantStore = create<AssistantState>()(persist((set) => ({
  visible: false, chatOpen: false, motionPaused: false, messages: [],
  show: () => set({ visible: true }),
  hide: () => set({ visible: false, chatOpen: false }),
  openChat: () => set({ visible: true, chatOpen: true }),
  closeChat: () => set({ chatOpen: false }),
  setMotionPaused: (motionPaused) => set({ motionPaused }),
  append: (message) => set((state) => ({ messages: [...state.messages, { ...message, id: crypto.randomUUID() }].slice(-40) })),
  clear: () => set({ messages: [] }),
}), {
  name: 'nandos:assistant', version: 1, storage,
  partialize: ({ visible, motionPaused, messages }) => ({ visible, motionPaused, messages }),
  merge: (persisted, current) => {
    const data = persisted && typeof persisted === 'object' ? persisted as Partial<AssistantState> : {}
    return { ...current, visible: data.visible === true, motionPaused: data.motionPaused === true, messages: readMessages(data.messages) }
  },
}))
