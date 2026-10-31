import { useEffect } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import type { PortfolioContent } from '@nandoos/contracts'
import type { AssistantReply, AssistantService } from '../domain/conversation'
import { useAssistantStore } from '../application/assistant.store'
import AssistantDock from './AssistantDock'

const fixture = vi.hoisted(() => ({ controller: { select: vi.fn(), answer: vi.fn() } }))
vi.mock('./SvgMascot', () => ({
  SvgMascot: ({ paused, onReady }: { paused: boolean; onReady(value: typeof fixture.controller | null): void }) => {
    useEffect(() => { onReady(fixture.controller); return () => onReady(null) }, [onReady])
    return <svg role="img" aria-label="Mascota retro de NandOS" data-paused={paused} />
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useAssistantStore.setState({ visible: false, chatOpen: false, messages: [], motionPaused: false })
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function mount(service?: AssistantService) {
  const onLaunchApp = vi.fn()
  const view = render(<AssistantDock content={DEFAULT_PORTFOLIO_CONTENT} viewport={{ x: 0, y: 0, width: 1280, height: 678 }} onLaunchApp={onLaunchApp} service={service} />)
  return { ...view, onLaunchApp }
}
function openChat() {
  fireEvent.click(screen.getByRole('button', { name: '¿Tienes dudas? Abrir asistente nandBot' }))
  fireEvent.click(screen.getByRole('button', { name: 'Abrir chat con nandBot' }))
}
function pendingService() {
  let resolve!: (reply: AssistantReply) => void
  const service = { ask: vi.fn((_question: string, _content: PortfolioContent, _signal: AbortSignal) => new Promise<AssistantReply>((done) => { resolve = done })) }
  return { service, resolve: (reply: AssistantReply) => resolve(reply) }
}

describe('desktop assistant', () => {
  it('shows only a launcher until activated, then mascot, then chat on explicit request', () => {
    mount()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '¿Tienes dudas? Abrir asistente nandBot' }))
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat con nandBot' }))
    expect(screen.getByRole('dialog', { name: 'nandBot · Ayuda' })).toBeInTheDocument()
    expect(screen.getByText(/¡Hola! Soy nandBot/)).toBeInTheDocument()
    expect(screen.getByText(/Demo local · sin IA/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '¿Dónde consulto el CV?' })).toBeInTheDocument()
  })
  it('animates thinking and answering, and only opens an app when the visitor clicks its action', async () => {
    const pending = pendingService()
    const { onLaunchApp } = mount(pending.service)
    openChat()
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    expect(screen.getByRole('status')).toHaveTextContent('pensando')
    expect(fixture.controller.select).toHaveBeenLastCalledWith('thinking')
    expect(screen.getByRole('button', { name: 'Pensando…' })).toBeDisabled()
    await act(async () => pending.resolve({ text: 'Aquí tienes el CV.', actions: ['cv'] }))
    expect(fixture.controller.answer).toHaveBeenCalledOnce()
    expect(onLaunchApp).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir CV en otra pestaña' }))
    expect(onLaunchApp).toHaveBeenCalledWith('cv-viewer')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('keeps conversation on minimize and hide, and restores the launcher', async () => {
    mount()
    openChat()
    act(() => useAssistantStore.getState().append({ role: 'assistant', text: 'Conversación de prueba' }))
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar asistente' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    openChat()
    expect(screen.getByText('Conversación de prueba')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir chat con nandBot' })).toHaveFocus())
  })
  it('cancels a pending reply when clearing, so an old request cannot resurrect history', async () => {
    const pending = pendingService()
    mount(pending.service)
    openChat()
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    const signal = pending.service.ask.mock.calls[0]?.[2] as AbortSignal | undefined
    fireEvent.click(screen.getByRole('button', { name: 'Borrar conversación' }))
    expect(signal?.aborted).toBe(true)
    await act(async () => pending.resolve({ text: 'Respuesta obsoleta' }))
    expect(screen.queryByText('Respuesta obsoleta')).not.toBeInTheDocument()
    expect(useAssistantStore.getState().messages).toEqual([])
  })
  it('supports writing, Enter to send, Shift+Enter for newline and prevents duplicate pending sends', async () => {
    const pending = pendingService()
    mount(pending.service)
    openChat()
    const input = screen.getByRole('textbox', { name: 'Tu pregunta' })
    fireEvent.change(input, { target: { value: 'Contacto' } })
    expect(fixture.controller.select).toHaveBeenLastCalledWith('listening')
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(pending.service.ask).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'Otra pregunta' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(pending.service.ask).toHaveBeenCalledOnce()
    await act(async () => pending.resolve({ text: 'Contacto disponible' }))
    expect(screen.getByText('Contacto disponible')).toBeInTheDocument()
  })
  it('reuses system maximize, restore and keyboard resize controls', () => {
    mount()
    openChat()
    fireEvent.click(screen.getByRole('button', { name: 'Maximizar' }))
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '1264px', height: '662px' })
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar tamaño' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Redimensionar nandBot · Ayuda' }), { key: 'ArrowRight' })
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '418px' })
  })
  it('honors reduced motion while keeping the chat usable', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    mount()
    openChat()
    expect(screen.getByRole('img')).toHaveAttribute('data-paused', 'true')
    expect(screen.getByRole('button', { name: 'Movimiento reducido activado' })).toBeDisabled()
    expect(within(screen.getByRole('dialog')).getByRole('textbox')).toBeEnabled()
  })
  it('shows a recoverable error instead of losing the conversation', async () => {
    mount({ ask: vi.fn().mockRejectedValue(new Error('offline')) })
    openChat()
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('volver a intentarlo')
    expect(useAssistantStore.getState().messages[0].role).toBe('user')
    expect(screen.getByRole('textbox')).toBeEnabled()
  })
  it('cancels pending work on logout/unmount and never appends a stale reply', async () => {
    const pending = pendingService()
    const { unmount } = mount(pending.service)
    openChat()
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    const signal = pending.service.ask.mock.calls[0][2]
    unmount()
    expect(signal.aborted).toBe(true)
    expect(useAssistantStore.getState().chatOpen).toBe(false)
    await act(async () => pending.resolve({ text: 'Respuesta de una sesión anterior' }))
    expect(useAssistantStore.getState().messages).toHaveLength(1)
  })
})
