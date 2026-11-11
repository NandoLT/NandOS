export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export const TASKBAR_HEIGHT = 42

const bootPreferenceKey = 'nandos:boot-completed'

export function shouldPlayBoot() {
  if (prefersReducedMotion()) return false
  try {
    return localStorage.getItem(bootPreferenceKey) !== '1'
  } catch {
    return true
  }
}

export function rememberBoot() {
  try {
    localStorage.setItem(bootPreferenceKey, '1')
  } catch {
    // The desktop remains usable when browser storage is unavailable.
  }
}
