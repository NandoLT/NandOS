import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoAssistant, getDemoReply } from './demo-assistant'

afterEach(() => vi.useRealTimers())

describe('local demonstration replies', () => {
  it('offers CV and contact actions without executing them', () => {
    expect(getDemoReply('¿Dónde consulto el CV?', DEFAULT_PORTFOLIO_CONTENT).actions).toEqual(['cv'])
    const content = structuredClone(DEFAULT_PORTFOLIO_CONTENT)
    content.contact.channels = [{ id: 'email', label: 'Email', icon: '', href: 'mailto:test@example.com', value: 'test@example.com' }]
    const reply = getDemoReply('¿Cómo me pongo en contacto con Fernando?', content)
    expect(reply.text).toContain('test@example.com')
    expect(reply.actions).toEqual(['contact'])
  })
  it('uses published portfolio data for experience and projects', () => {
    expect(getDemoReply('¿Qué experiencia tiene?', DEFAULT_PORTFOLIO_CONTENT).text).toContain('Frontend Engineer')
    expect(getDemoReply('¿Qué proyectos puedo ver?', DEFAULT_PORTFOLIO_CONTENT).text).toContain('Nivichat')
  })
  it('does not invent answers for unsupported questions', () => {
    const reply = getDemoReply('¿Qué tiempo hará mañana?', DEFAULT_PORTFOLIO_CONTENT)
    expect(reply.text).toContain('demostración')
    expect(reply.text).toContain('wiki')
    expect(reply.actions).toBeUndefined()
  })
  it('supports cancellation of a pending demonstration response', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const response = demoAssistant.ask('CV', DEFAULT_PORTFOLIO_CONTENT, controller.signal)
    const assertion = expect(response).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await assertion
    expect(vi.getTimerCount()).toBe(0)
  })
})
