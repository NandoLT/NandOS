import type { WindowBounds } from './types'

export const HELP_HOME_HEIGHT = 420
export const HELP_READING_HEIGHT = 600

/** Keep the complete help frame inside the desktop, excluding the taskbar. */
export function fitHelpWindowBounds(bounds: WindowBounds, viewport: WindowBounds, reading: boolean): WindowBounds {
  const margin = 8
  const width = Math.min(bounds.width, Math.max(0, viewport.width - margin * 2))
  const height = Math.min(reading ? HELP_READING_HEIGHT : HELP_HOME_HEIGHT, Math.max(0, viewport.height - margin * 2))
  return {
    x: Math.max(margin, Math.min(bounds.x, viewport.width - width - margin)),
    y: Math.max(margin, Math.min(bounds.y, viewport.height - height - margin)),
    width,
    height,
  }
}
