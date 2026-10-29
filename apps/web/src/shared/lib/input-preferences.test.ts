import { afterEach, describe, expect, it, vi } from 'vitest'
import { rememberBoot, shouldPlayBoot } from './input-preferences'

afterEach(() => { localStorage.removeItem('nandos:boot-completed'); vi.unstubAllGlobals() })

describe('boot preferences', () => {
  it('plays the boot on the first visit and remembers completion for later visits', () => {
    localStorage.removeItem('nandos:boot-completed')
    expect(shouldPlayBoot()).toBe(true)
    rememberBoot()
    expect(shouldPlayBoot()).toBe(false)
  })

  it('skips the boot on a first visit when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    expect(shouldPlayBoot()).toBe(false)
  })
})
