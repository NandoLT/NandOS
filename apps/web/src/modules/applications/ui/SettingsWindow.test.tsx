import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsWindow } from './SettingsWindow'

afterEach(cleanup)

describe('SettingsWindow', () => {
  it('shows the available themes and requests the selected theme', () => {
    const onSelectTheme = vi.fn()
    render(<SettingsWindow selectedThemeId="classic-95" onSelectTheme={onSelectTheme} />)

    expect(screen.getByRole('button', { name: /Classic 95/ })).toHaveAttribute('aria-pressed', 'true')
    const modernTheme = screen.getByRole('button', { name: /Modern Desktop/ })
    fireEvent.click(modernTheme)

    expect(onSelectTheme).toHaveBeenCalledWith('modern-desktop')
  })
})
