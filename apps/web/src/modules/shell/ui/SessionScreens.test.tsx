import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BootScreen, GuestLogin } from './SessionScreens'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('guest login', () => {
  it('offers immediate guest access while preserving the demonstration login', () => {
    const onLogin = vi.fn()
    render(<GuestLogin onLogin={onLogin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar como invitado' }))
    expect(onLogin).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('Contraseña:')).toHaveValue('')
  })

  it('skips the boot waiting time when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const onComplete = vi.fn()
    render(<BootScreen onComplete={onComplete} />)
    expect(onComplete).toHaveBeenCalledOnce()
  })
  it('accepts the demonstration password and rejects other values', () => {
    const onLogin = vi.fn()
    render(<GuestLogin onLogin={onLogin} />)

    expect(screen.getByLabelText('Usuario:')).toHaveValue('Invitado')

    fireEvent.change(screen.getByLabelText('Contraseña:'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Contraseña incorrecta')
    expect(onLogin).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Contraseña:'), { target: { value: '12345' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(onLogin).toHaveBeenCalledOnce()
  })

  it('offers a distinct entry to the administrative login', () => {
    const onAdminLogin = vi.fn()
    render(<GuestLogin onLogin={vi.fn()} onAdminLogin={onAdminLogin} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acceso de administración' }))

    expect(onAdminLogin).toHaveBeenCalledOnce()
  })
})
