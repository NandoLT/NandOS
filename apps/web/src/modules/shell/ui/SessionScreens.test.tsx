import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BootScreen, GuestLogin } from './SessionScreens'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('guest login', () => {
  it('offers immediate guest access with the initial keyboard focus', () => {
    const onLogin = vi.fn()
    render(<GuestLogin onLogin={onLogin} />)
    const button = screen.getByRole('button', { name: 'Entrar como invitado' })
    expect(button).toHaveFocus()
    fireEvent.click(button)
    expect(onLogin).toHaveBeenCalledOnce()
  })

  it('skips the boot waiting time when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const onComplete = vi.fn()
    render(<BootScreen onComplete={onComplete} />)
    expect(onComplete).toHaveBeenCalledOnce()
  })
  it('does not render the guest credentials form or its demonstration hints', () => {
    render(<GuestLogin onLogin={vi.fn()} />)
    expect(screen.queryByLabelText('Usuario:')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña:')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument()
    expect(screen.queryByText(/12345|Escribe la contraseña|Contraseña de demostración/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('offers a distinct entry to the administrative login', () => {
    const onAdminLogin = vi.fn()
    render(<GuestLogin onLogin={vi.fn()} onAdminLogin={onAdminLogin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acceso de administración' }))

    expect(onAdminLogin).toHaveBeenCalledOnce()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
