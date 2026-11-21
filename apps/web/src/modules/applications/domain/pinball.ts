export type PinballControl = 'left' | 'right' | 'launch'
export type PinballInputs = Record<PinballControl, boolean>
export type PinballSnapshot = { ready: boolean; charge: number; shots: number; drains: number; hits: number }
export type PinballRail = { from: [number, number]; to: [number, number] }
export const BALL_RADIUS = .22
export const BALL_START = { x: 4, y: -5.7, z: .3 }
export const FLIPPER_LENGTH = 1.75
export const FLIPPER_PIVOTS = [-2, 2] as const
export const FLIPPER_Y = -4.65
export const FLIPPER_REST = -.42
export const FLIPPER_UP = .48
export const pinballBumpers = [ { x: -1.5, y: 2.5 }, { x: 1.25, y: 3.4 }, { x: .1, y: .7 } ]
export const pinballRails: PinballRail[] = [
  { from: [-4.5, -6.8], to: [-4.5, 5.5] },
  { from: [-4.5, 5.5], to: [-3.6, 6.7] },
  { from: [-3.6, 6.7], to: [2.8, 6.7] },
  { from: [2.8, 6.7], to: [4.5, 5.3] },
  { from: [4.5, 5.3], to: [4.5, -6.8] },
  { from: [3.35, -6.8], to: [3.35, 4.8] },
  { from: [-4.5, -2.4], to: [-2, -4.65] },
  { from: [3.35, -2.4], to: [2, -4.65] },
  { from: [3.35, -6.45], to: [4.5, -6.45] },
]
export function railGeometry({ from, to }: PinballRail) {
  return { x: (from[0] + to[0]) / 2, y: (from[1] + to[1]) / 2,
    length: Math.hypot(to[0] - from[0], to[1] - from[1]), angle: Math.atan2(to[1] - from[1], to[0] - from[0]) }
}
export const flipperAngle = (side: 0 | 1, amount: number) => side === 0 ? amount : Math.PI - amount
export const rotationZ = (angle: number) => ({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) })
