import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminLogin } from './AdminLogin'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminLogin', () => {
  it('uses the real API login and never pre-fills demo credentials', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ configured: true, canSetup: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'nando' }) })
    vi.stubGlobal('fetch', fetchMock)
    const onAuthenticated = vi.fn()

    render(<AdminLogin onAuthenticated={onAuthenticated} onBackToGuest={vi.fn()} />)

    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    expect(screen.getByLabelText('Usuario:')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña:')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Usuario:'), { target: { value: 'nando' } })
    fireEvent.change(screen.getByLabelText('Contraseña:'), { target: { value: 'a-long-admin-passphrase' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('nando'))
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/login')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'include' })
  })

  it('only shows first-account setup when the server advertises a bootstrap key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false, canSetup: true }),
    }))
    render(<AdminLogin onAuthenticated={vi.fn()} onBackToGuest={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Configurar administrador' })).toBeInTheDocument()
    expect(screen.getByLabelText('Clave inicial:')).toHaveValue('')
    expect(screen.getByLabelText('Usuario:')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña:')).toHaveValue('')
  })
})
