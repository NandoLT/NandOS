import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeId } from './theme'

type ThemePreferences = {
  selectedThemeId: ThemeId
  setSelectedThemeId: (themeId: ThemeId) => void
}

export const useThemeStore = create<ThemePreferences>()(
  persist(
    (set) => ({
      selectedThemeId: 'classic-95',
      setSelectedThemeId: (selectedThemeId) => set({ selectedThemeId }),
    }),
    {
      name: 'nandoos:theme-preferences',
      version: 1,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<ThemePreferences>
        return {
          selectedThemeId:
            persisted.selectedThemeId === 'modern-desktop' ? 'modern-desktop' : 'classic-95',
        }
      },
      partialize: (state) => ({ selectedThemeId: state.selectedThemeId }),
    }
  )
)
