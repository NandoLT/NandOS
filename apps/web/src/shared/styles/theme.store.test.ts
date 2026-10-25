import { beforeEach, describe, expect, it } from 'vitest'
import { useThemeStore } from './theme.store'

describe('theme preferences', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ selectedThemeId: 'classic-95' })
  })

  it('persists the selected desktop theme in local storage', () => {
    useThemeStore.getState().setSelectedThemeId('modern-desktop')

    const storedPreferences = JSON.parse(localStorage.getItem('nandoos:theme-preferences') ?? '{}')
    expect(storedPreferences.state.selectedThemeId).toBe('modern-desktop')
  })
})
