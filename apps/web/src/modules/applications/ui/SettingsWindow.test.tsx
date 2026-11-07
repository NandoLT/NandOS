import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultGuestProfile, useGuestProfile } from '../../shell/application/guest-profile.store'
import { GuestLogin } from '../../shell/ui/SessionScreens'
import { prepareGuestAvatar } from '../../../shared/lib/guest-avatar-photo'
import { SettingsWindow } from './SettingsWindow'

vi.mock('../../../shared/lib/guest-avatar-photo', { spy: true })
beforeEach(() => useGuestProfile.setState(defaultGuestProfile))
afterEach(cleanup)
afterEach(() => vi.restoreAllMocks())

describe('SettingsWindow', () => {
  it('shows the original silhouette until a guest avatar is chosen', () => {
    render(<GuestLogin onLogin={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'Avatar de invitado' })).toHaveAttribute('src', '/guest-default.svg')
  })
  it('shows the available themes and requests the selected theme', () => {
    const onSelectTheme = vi.fn()
    render(<SettingsWindow selectedThemeId="classic-95" onSelectTheme={onSelectTheme} />)

    expect(screen.getByRole('button', { name: /Classic 95/ })).toHaveAttribute('aria-pressed', 'true')
    const modernTheme = screen.getByRole('button', { name: /Modern Desktop/ })
    fireEvent.click(modernTheme)

    expect(onSelectTheme).toHaveBeenCalledWith('modern-desktop')
  })

  it('saves a guest name and preset avatar and restores both on the entry screen', async () => {
    const view = render(<SettingsWindow selectedThemeId="classic-95" onSelectTheme={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Usuario' }))
    fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: '  Mara  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gato' }))
    expect(screen.getByRole('img', { name: 'Vista previa del avatar' })).toHaveAttribute('src', '/guest-cat.svg')
    expect(useGuestProfile.getState().name).toBe('Invitado')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    expect(screen.getByRole('status')).toHaveTextContent('Perfil guardado')
    view.unmount()
    await act(async () => { await useGuestProfile.persist.rehydrate() })
    render(<GuestLogin onLogin={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Bienvenido, Mara' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Avatar de invitado' })).toHaveAttribute('src', '/guest-cat.svg')
  })

  it('uses a prepared local photo as the saved avatar', async () => {
    const photo = new File(['photo'], 'avatar.png', { type: 'image/png' })
    const src = 'data:image/webp;base64,AAAA'
    const prepare = vi.mocked(prepareGuestAvatar).mockResolvedValueOnce(src)
    render(<SettingsWindow selectedThemeId="classic-95" onSelectTheme={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Usuario' }))
    fireEvent.change(screen.getByLabelText('Subir una foto'), { target: { files: [photo] } })
    expect(prepare).toHaveBeenCalledWith(photo)
    await waitFor(() => expect(screen.getByRole('img', { name: 'Vista previa del avatar' })).toHaveAttribute('src', src))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    expect(useGuestProfile.getState().avatar).toEqual({ type: 'photo', src })
  })

  it('rejects an unsupported photo without replacing the selected avatar', async () => {
    render(<SettingsWindow selectedThemeId="classic-95" onSelectTheme={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Usuario' }))
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByLabelText('Subir una foto'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG o WebP')
    expect(screen.getByRole('button', { name: 'Predeterminado' })).toHaveAttribute('aria-pressed', 'true')
  })
})
