import type { PinballGame } from './pinball-game'

export type PinballControl = 'left' | 'right' | 'launch'
export type PinballInputs = Record<PinballControl, boolean>
export type PinballSnapshot = { ready: boolean; charge: number; shots: number; drains: number; hits: number; game: PinballGame }
export type PinballPoint = [number, number]
export type PinballRail = { from: PinballPoint; to: PinballPoint }
export const BALL_RADIUS = .16
export const TABLE_WIDTH = 9.8
export const TABLE_HEIGHT = 14.6
export const FIELD_CENTER = -.55
export const SHOOTER_WIDTH = .94
export const LANE_RAIL_RADIUS = .065
export const BALL_START = { x: 4.08, y: -5.7, z: .3 }
export const PLUNGER_STROKE = .42
export const PLUNGER_HEAD_Y = BALL_START.y - BALL_RADIUS - .05
export const PLUNGER_BASE_Y = -6.85
export const FLIPPER_LENGTH = 1.72
export const FLIPPER_RADIUS = .145
export const FLIPPER_PIVOTS = [FIELD_CENTER - 1.91, FIELD_CENTER + 1.91] as const
export const FLIPPER_Y = -5.55
export const FLIPPER_REST = -.38
export const FLIPPER_UP = .48
export const TARGET_ANGLE = .65
export const TARGET_THICKNESS = .32
export const TARGET_WIDTH = 1.24
export const TARGET_FACE_WIDTH = .29
export const TARGET_FACE_OFFSET = -.18
export const TARGET_FACE_CENTERS = [-.4, 0, .4]

export const pinballBumpers = [3.38, 1.79].flatMap((y) => [-.88, .88].map((offset) => ({
  x: FIELD_CENTER + offset, y, radius: .46,
})))

export const pinballTargets = [-1, 1].map((side) => ({
  x: FIELD_CENTER + side * 2.75, y: -.48, angle: -side * TARGET_ANGLE,
}))

function arc(x: number, y: number, radius: number, from: number, to: number, steps: number): PinballPoint[] {
  return Array.from({ length: steps + 1 }, (_, step) => {
    const angle = (from + (to - from) * step / steps) * Math.PI / 180
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]
  })
}

const shoulder = BALL_START.x - 1.45
const leftBend = -2.44
const top = 6.05
export const pinballShooterPath: PinballPoint[] = [
  [BALL_START.x, -7.08],
  ...arc(shoulder, top - 1.45, 1.45, 0, 90, 26),
  ...arc(leftBend, top - 1.55, 1.55, 90, 117, 10),
  ...arc(leftBend, top - 1.55, 1.55, 117, 205, 30).slice(1),
]
const [exitX, exitY] = pinballShooterPath.at(-1)!
const exitAngle = 205 * Math.PI / 180
export const SHOOTER_EXIT = { x: exitX, y: exitY, dx: -Math.sin(exitAngle), dy: Math.cos(exitAngle) }
export const SHOOTER_GATE = {
  x: exitX + SHOOTER_EXIT.dy * SHOOTER_WIDTH / 2,
  y: exitY - SHOOTER_EXIT.dx * SHOOTER_WIDTH / 2,
  angle: Math.atan2(SHOOTER_EXIT.dx, -SHOOTER_EXIT.dy),
  length: SHOOTER_WIDTH,
}
// A ball must cross the two straight sections in order, then leave the outlet.
export const ORBIT_ENTRY = { x: BALL_START.x, y: 3.9 }
export const ORBIT_CROSSING = { x: 0, y: top }

function offsetPath(points: PinballPoint[], offset: number): PinballPoint[] {
  return points.map(([x, y], index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    const before = Math.atan2(y - previous[1], x - previous[0])
    const after = Math.atan2(next[1] - y, next[0] - x)
    const angle = index === 0 ? after : index === points.length - 1 ? before : Math.atan2(Math.sin(before) + Math.sin(after), Math.cos(before) + Math.cos(after))
    return [x - Math.sin(angle) * offset, y + Math.cos(angle) * offset]
  })
}

export const pinballOrbitEdges = [-1, 1].map((side) => offsetPath(pinballShooterPath, side * SHOOTER_WIDTH / 2))
export const pinballCabinet: PinballPoint[] = [
  [-4.72, -7.1], [-4.72, 5.4], [-3.38, 7.02], [3.38, 7.02],
  [4.72, 5.4], [4.72, -7.1],
]
const outerOutlet = pinballOrbitEdges[0].at(-1)!
export const pinballOutletBrace: PinballPoint[] = [outerOutlet, [pinballCabinet[0][0], outerOutlet[1]]]
export const pinballReturnLanes = [-1, 1].map((side) => {
  const point = (offset: number, y: number): PinballPoint => [FIELD_CENTER + side * offset, y]
  const branch = point(3.02, -4.77)
  return {
    divider: [point(3.58, -2.63), point(3.37, -2.9), point(3.21, -3.32),
      point(3.1, -3.9), branch, point(3.02, -7.1)],
    // Continue under the flipper rather than creating a pocket behind its rounded pivot.
    feed: [branch, point(2.75, -4.84), point(2.52, -5.04), point(1.39, -5.82)],
  }
})
export const pinballGuidePaths = [
  ...pinballOrbitEdges, pinballOutletBrace, ...pinballReturnLanes.flatMap(({ divider, feed }) => [divider, feed]),
]
export const pinballSlings = [-1, 1].map((side) => {
  const tip: PinballPoint = [FIELD_CENTER + side * 2.45, -2.85]
  const outer: PinballPoint = [FIELD_CENTER + side * 2.4, -4.19]
  const inner: PinballPoint = [FIELD_CENTER + side * 1.51, -4.55]
  const dx = inner[0] - tip[0], dy = inner[1] - tip[1]
  const length = Math.hypot(dx, dy)
  return { points: [tip, outer, inner], active: { from: tip, to: inner }, normal: [side * dy / length, -side * dx / length] as PinballPoint }
})

export function pathRails(points: PinballPoint[]): PinballRail[] {
  return points.slice(1).map((point, index) => ({ from: points[index], to: point }))
}
export function railGeometry({ from, to }: PinballRail) {
  return { x: (from[0] + to[0]) / 2, y: (from[1] + to[1]) / 2,
    length: Math.hypot(to[0] - from[0], to[1] - from[1]), angle: Math.atan2(to[1] - from[1], to[0] - from[0]) }
}
export function distanceToRail(point: PinballPoint, rail: PinballRail) {
  const dx = rail.to[0] - rail.from[0], dy = rail.to[1] - rail.from[1]
  const t = Math.max(0, Math.min(1, ((point[0] - rail.from[0]) * dx + (point[1] - rail.from[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point[0] - rail.from[0] - t * dx, point[1] - rail.from[1] - t * dy)
}
export const flipperAngle = (side: 0 | 1, amount: number) => side === 0 ? amount : Math.PI - amount
export const rotationZ = (angle: number) => ({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) })
