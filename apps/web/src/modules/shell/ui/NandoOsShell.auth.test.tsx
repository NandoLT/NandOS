import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import { renderWithProviders as render } from '../../../test/render'
import { NandoOsShell } from './NandoOsShell'

function mockApi() {
  const fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    json: async () => {
      if (url.endsWith('/auth/session') || url.endsWith('/auth/login')) {
        return { authenticated: true, username: 'test-admin' }
      }
      if (url.endsWith('/auth/bootstrap-status')) return { configured: true, canSetup: false }
      if (url.endsWith('/auth/logout')) return { authenticated: false }
      return {
        content: DEFAULT_PORTFOLIO_CONTENT,
        draft: DEFAULT_PORTFOLIO_CONTENT,
        published: DEFAULT_PORTFOLIO_CONTENT,
        revision: 1,
        publishedAt: null,
      }
    },
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  localStorage.setItem('nandos:boot-completed', '1')
  mockApi()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function signIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Acceso de administración' }))
  await screen.findByLabelText('Usuario:')
  fireEvent.change(screen.getByLabelText('Usuario:'), { target: { value: 'test-admin' } })
  fireEvent.change(screen.getByLabelText('Contraseña:'), { target: { value: 'test-only-passphrase' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await screen.findByRole('heading', { name: 'Administración del portfolio' })
}

describe('explicit administration access', () => {
  it('shows the access chooser even if the server still has a valid admin session', async () => {
    const fetchMock = mockApi()
    render(<NandoOsShell />)
    await act(async () => {})
    expect(screen.getByRole('heading', { name: 'Bienvenido, Invitado' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Administración del portfolio' })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/auth/session'))).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar como invitado' }))
    expect(screen.getByRole('button', { name: 'Abrir menú de aplicaciones' })).toBeInTheDocument()
  })

  it('finishes the boot at the chooser instead of restoring administration', async () => {
    localStorage.removeItem('nandos:boot-completed')
    render(<NandoOsShell />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Omitir inicio' }))
    expect(screen.getByRole('heading', { name: 'Bienvenido, Invitado' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Administración del portfolio' })).not.toBeInTheDocument()
  })

  it('requires credentials again after unmounting and reopening an authenticated page', async () => {
    const view = render(<NandoOsShell />)
    await signIn()
    view.unmount()
    render(<NandoOsShell />)
    await act(async () => {})
    expect(screen.getByRole('heading', { name: 'Bienvenido, Invitado' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Acceso de administración' }))
    expect(await screen.findByLabelText('Usuario:')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña:')).toHaveValue('')
    expect(screen.queryByRole('heading', { name: 'Administración del portfolio' })).not.toBeInTheDocument()
  })

  it('returns to the chooser when history restores a cached admin page', async () => {
    render(<NandoOsShell />)
    await signIn()
    fireEvent(window, new PageTransitionEvent('pageshow', { persisted: true }))
    expect(screen.getByRole('heading', { name: 'Bienvenido, Invitado' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Administración del portfolio' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Acceso de administración' }))
    expect(await screen.findByLabelText('Usuario:')).toHaveValue('')
  })

  it('keeps an active admin login during ordinary pageshow events and logs out explicitly', async () => {
    render(<NandoOsShell />)
    await signIn()
    fireEvent(window, new PageTransitionEvent('pageshow', { persisted: false }))
    expect(screen.getByRole('heading', { name: 'Administración del portfolio' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Invitado' })).toBeInTheDocument()
  })
})
