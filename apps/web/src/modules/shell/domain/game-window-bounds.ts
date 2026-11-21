import type { WindowBounds } from './types'

/** Use the whole desktop before clipping a game that can fit after moving. */
export function fitGameWindowBounds(bounds: WindowBounds, viewport: WindowBounds): WindowBounds {
  const margin = 8
  const width = Math.min(bounds.width, Math.max(0, viewport.width - margin * 2))
  const height = Math.min(bounds.height, Math.max(0, viewport.height - margin * 2))
  const mobile = viewport.width <= 640
  return {
    x: mobile ? margin : Math.max(margin, Math.min(bounds.x, viewport.width - width - margin)),
    y: mobile ? margin : Math.max(margin, Math.min(bounds.y, viewport.height - height - margin)),
    width,
    height,
  }
}
