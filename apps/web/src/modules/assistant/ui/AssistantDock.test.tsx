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
  useAssistantStore.setState({ visible: false, chatOpen: false, messages: [], mode: null })
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
    expect(screen.getByRole('img').closest('[data-entrance="fall-bounce"]')).toBeInTheDocument()
    const entrance = screen.getByRole('img').closest('[data-entrance="fall-bounce"]')
    expect(entrance).toContainElement(screen.getByRole('group', { name: 'Acciones de nandBot' }))
    expect(entrance).toContainElement(screen.getByRole('button', { name: 'Abrir chat con nandBot' }))
    expect(entrance).toContainElement(screen.getByRole('button', { name: 'Ocultar asistente' }))
    expect(screen.queryByRole('button', { name: /Pausar|Reanudar/ })).not.toBeInTheDocument()
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
  it('starts fresh after minimizing, closing or hiding the assistant', async () => {
    mount()
    openChat()
    act(() => useAssistantStore.getState().append({ role: 'assistant', text: 'Conversación de prueba' }))
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar asistente' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    openChat()
    expect(screen.queryByText('Conversación de prueba')).not.toBeInTheDocument()
    expect(screen.getByText(/¡Hola! Soy nandBot/)).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Movimiento reducido activado' })).not.toBeInTheDocument()
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
    expect(useAssistantStore.getState().messages).toHaveLength(0)
  })
  it('removes the introduction on the first question and keeps FAQ outside the scrolling history', async () => {
    const pending = pendingService()
    mount(pending.service)
    openChat()
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    expect(screen.queryByText(/¡Hola! Soy nandBot/)).not.toBeInTheDocument()
    const faq = screen.getByRole('button', { name: 'Preguntas frecuentes' })
    expect(screen.getByRole('log')).not.toContainElement(faq)
    fireEvent.click(faq)
    const menu = screen.getByRole('menu', { name: 'Preguntas frecuentes' })
    expect(menu).toHaveStyle({ position: 'fixed' })
    expect(screen.getByRole('log')).not.toContainElement(menu)
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(faq).toHaveFocus()
    await act(async () => pending.resolve({ text: 'Respuesta de CV' }))
  })
  it('replaces FAQ answers but accumulates a free-text conversation separately', async () => {
    mount({ ask: vi.fn(async (question: string) => ({ text: `Respuesta: ${question}` })) })
    openChat()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' })))
    fireEvent.click(screen.getByRole('button', { name: 'Preguntas frecuentes' }))
    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: '¿Qué proyectos puedo ver?' })))
    expect(useAssistantStore.getState().messages).toHaveLength(2)
    expect(screen.queryByText('Respuesta: ¿Dónde consulto el CV?')).not.toBeInTheDocument()
    const input = screen.getByRole('textbox')
    for (const text of ['Primera pregunta libre', 'Segunda pregunta libre']) {
      fireEvent.change(input, { target: { value: text } })
      await act(async () => fireEvent.keyDown(input, { key: 'Enter' }))
    }
    expect(screen.queryByText('Respuesta: ¿Qué proyectos puedo ver?')).not.toBeInTheDocument()
    expect(useAssistantStore.getState().messages).toHaveLength(4)
    expect(screen.getByText('Respuesta: Primera pregunta libre')).toBeInTheDocument()
    expect(screen.getByText('Respuesta: Segunda pregunta libre')).toBeInTheDocument()
  })
  it('cancels a pending answer when closing and reopens with a clean introduction', async () => {
    const pending = pendingService()
    mount(pending.service)
    openChat()
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    const signal = pending.service.ask.mock.calls[0][2]
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(signal.aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat con nandBot' }))
    await act(async () => pending.resolve({ text: 'Respuesta de la sesión cerrada' }))
    expect(screen.queryByText('Respuesta de la sesión cerrada')).not.toBeInTheDocument()
    expect(screen.getByText(/¡Hola! Soy nandBot/)).toBeInTheDocument()
    expect(useAssistantStore.getState().messages).toEqual([])
  })
  it('lets a new FAQ supersede a pending request without accepting its obsolete answer', async () => {
    const first = pendingService()
    const second = pendingService()
    const service = { ask: vi.fn().mockImplementationOnce(first.service.ask).mockImplementationOnce(second.service.ask) }
    mount(service)
    openChat()
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    const oldSignal = first.service.ask.mock.calls[0][2]
    fireEvent.click(screen.getByRole('button', { name: 'Preguntas frecuentes' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '¿Qué proyectos puedo ver?' }))
    expect(oldSignal.aborted).toBe(true)
    await act(async () => first.resolve({ text: 'Respuesta obsoleta' }))
    expect(screen.queryByText('Respuesta obsoleta')).not.toBeInTheDocument()
    await act(async () => second.resolve({ text: 'Respuesta vigente' }))
    expect(screen.getByText('Respuesta vigente')).toBeInTheDocument()
    expect(useAssistantStore.getState().messages).toHaveLength(2)
  })
  it('navigates FAQ by keyboard and dismisses it on outside pointer down', () => {
    mount()
    openChat()
    const trigger = screen.getByRole('button', { name: 'Preguntas frecuentes' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const menu = screen.getByRole('menu')
    const items = within(menu).getAllByRole('menuitem')
    expect(items[0]).toHaveFocus()
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(items[1]).toHaveFocus()
    fireEvent.keyDown(items[1], { key: 'End' })
    expect(items.at(-1)).toHaveFocus()
    fireEvent.pointerDown(screen.getByRole('textbox'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('starts FAQ answers at the top instead of jumping to the end of a long answer', async () => {
    const pending = pendingService()
    mount(pending.service)
    openChat()
    const history = screen.getByRole('log')
    Object.defineProperty(history, 'scrollHeight', { configurable: true, value: 900 })
    history.scrollTop = 500
    fireEvent.click(screen.getByRole('button', { name: '¿Dónde consulto el CV?' }))
    await act(async () => pending.resolve({ text: 'Una respuesta larga' }))
    expect(history.scrollTop).toBe(0)
  })
})
