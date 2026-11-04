import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantDevelopmentNotice } from './AssistantDevelopmentNotice'

const dialogMethods = ['showModal', 'close'] as const
const nativeMethods = new Map(dialogMethods.map((method) => [method, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, method)]))
beforeEach(() => {
  // jsdom does not implement the browser's native modal dialog methods.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', '') }) },
    close: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open') }) },
  })
})
afterEach(() => {
  cleanup()
  for (const method of dialogMethods) {
    const descriptor = nativeMethods.get(method)
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, method, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, method)
  }
  vi.restoreAllMocks()
})

describe('assistant development notice', () => {
  it('shows a compact warning and an accessible information tag without opening a dialog automatically', () => {
    render(<AssistantDevelopmentNotice />)
    expect(screen.getByText('Chatbot en proceso')).toBeInTheDocument()
    expect(screen.getByText(/Demostración sin IA/)).toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: '+ información' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.mouseOver(trigger)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('title', expect.stringContaining('arquitectura'))
  })

  it('explains the current demo, domestic hosting, RAG and optional System One without claiming they are active', () => {
    render(<AssistantDevelopmentNotice />)
    fireEvent.click(screen.getByRole('button', { name: '+ información' }))
    const dialog = screen.getByRole('dialog', { name: 'El futuro de nandBot' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    for (const text of ['Qdrant', 'LiteLLM', 'Neon', 'Vercel', 'System One']) expect(dialog).toHaveTextContent(text)
    expect(dialog).toHaveTextContent(/servidor en casa/)
    expect(dialog).toHaveTextContent(/no consulta todavía la wiki/)
    expect(dialog).toHaveTextContent(/Jev u otra alternativa/)
    expect(dialog).toHaveTextContent(/Sin fecha de activación/)
    expect(within(dialog).getByRole('button', { name: 'Entendido' })).toHaveFocus()
  })

  it('closes on Escape without closing its parent chat, restores focus and keeps no information state', () => {
    const parentKey = vi.fn()
    render(<div onKeyDown={parentKey}><AssistantDevelopmentNotice /></div>)
    const trigger = screen.getByRole('button', { name: '+ información' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(parentKey).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('honors the native cancellation event and releases its dialog on unmount', () => {
    const { unmount } = render(<AssistantDevelopmentNotice />)
    fireEvent.click(screen.getByRole('button', { name: '+ información' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ información' }))
    const dialog = screen.getByRole('dialog')
    unmount()
    expect(dialog.isConnected).toBe(false)
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
  })
})
