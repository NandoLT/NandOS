import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuestLogin } from './SessionScreens'

describe('guest login', () => {
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
