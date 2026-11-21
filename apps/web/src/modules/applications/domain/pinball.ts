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
export const pinballBumpers = [
  { x: -.35, y: 3.65, radius: .48 }, { x: 1.15, y: 4.15, radius: .48 },
  { x: .55, y: 2.55, radius: .46 }, { x: -3.1, y: 5.5, radius: .43 },
  { x: -3.65, y: -.9, radius: .35 }, { x: -3.05, y: -1.8, radius: .35 },
]
export const pinballTargets = [
  ...[0, 1, 2].map((index) => ({ x: -1.55 + index * .34, y: 1.8, angle: -.2 })),
  ...[0, 1, 2, 3].map((index) => ({ x: 2.55, y: -.7 + index * .45, angle: Math.PI / 2 })),
  ...[0, 1, 2].map((index) => ({ x: -.7 + index * .48, y: 5.25, angle: 0 })),
]
export function cubicLane(points: readonly [number, number][], steps = 24): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps, u = 1 - t
    return [u ** 3 * points[0][0] + 3 * u ** 2 * t * points[1][0] + 3 * u * t ** 2 * points[2][0] + t ** 3 * points[3][0],
      u ** 3 * points[0][1] + 3 * u ** 2 * t * points[1][1] + 3 * u * t ** 2 * points[2][1] + t ** 3 * points[3][1]]
  })
}
export const pinballLanes = [
  { id: 'launch-ramp', width: .68, points: cubicLane([[-3.6, .1], [-4.7, 4.4], [-2.8, 4.6], [-1, 1.2]]) },
  { id: 'orbit', width: .58, points: cubicLane([[-2.4, 5.25], [2.4, 6.15], [2.6, 4.3], [2.2, 1.5]]) },
]
export const pinballLaneEdges: [number, number][][] = pinballLanes.flatMap(({ points, width }) => {
  const edges = [-1, 1].map((side) => points.map(([x, y], index) => {
    const previous = points[Math.max(0, index - 1)], next = points[Math.min(points.length - 1, index + 1)]
    const dx = next[0] - previous[0], dy = next[1] - previous[1], length = Math.hypot(dx, dy)
    return [x - dy / length * width / 2 * side, y + dx / length * width / 2 * side] as [number, number]
  }))
  return edges
})
export const pinballLaneRails: PinballRail[] = pinballLaneEdges.flatMap((edge) => edge.slice(1).map((point, index) => ({ from: edge[index], to: point })))
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
