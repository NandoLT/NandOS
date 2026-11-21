import { CanvasTexture, SRGBColorSpace } from 'three'
import { pinballLanes } from '../domain/pinball'

/** Original procedural playfield artwork; no original game bitmap is embedded. */
export function createPinballArtwork() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 1536
  const ctx = canvas.getContext('2d')!
  const sx = canvas.width / 9.6, sy = canvas.height / 14.4
  const point = (x: number, y: number): [number, number] => [(x + 4.8) * sx, (7.2 - y) * sy]
  const line = (points: readonly [number, number][], color: string, width: number, close = false) => {
    ctx.beginPath(); points.forEach(([x, y], index) => { const p = point(x, y); if (index) ctx.lineTo(...p); else ctx.moveTo(...p) })
    if (close) ctx.closePath()
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke()
  }
  const circle = (x: number, y: number, radius: number, fill: string | CanvasGradient, stroke?: string) => {
    ctx.beginPath(); ctx.arc(...point(x, y), radius * sx, 0, Math.PI * 2)
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke() }
  }
  const polygon = (points: [number, number][], fill: string, stroke?: string) => {
    ctx.beginPath(); points.forEach(([x, y], index) => { const p = point(x, y); if (index) ctx.lineTo(...p); else ctx.moveTo(...p) }); ctx.closePath()
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke() }
  }
  const label = (text: string, x: number, y: number, size = 20, color = '#b1d4db', angle = 0) => {
    ctx.save(); ctx.translate(...point(x, y)); ctx.rotate(angle); ctx.fillStyle = color
    ctx.font = 'bold ' + size + 'px monospace'; ctx.textAlign = 'center'; ctx.fillText(text, 0, 0); ctx.restore()
  }
  const background = ctx.createLinearGradient(0, 0, 1024, 1536)
  background.addColorStop(0, '#192a39'); background.addColorStop(.48, '#123957'); background.addColorStop(1, '#151c3a')
  ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 1536)
  // Hexagonal armour pattern, kept subdued so the ball remains legible.
  for (let row = 0; row < 27; row++) for (let column = 0; column < 16; column++) {
    const x = -4.8 + column * .65 + row % 2 * .325, y = -7.2 + row * .57
    const vertices = Array.from({ length: 6 }, (_, index): [number, number] => [x + Math.cos(index * Math.PI / 3) * .32, y + Math.sin(index * Math.PI / 3) * .32])
    line(vertices, '#2b57714a', 2, true)
  }
  for (let index = 0; index < 100; index++) {
    const x = Math.sin(index * 137.31) * 4.1, y = Math.sin(index * 49.71 + 1) * 6.5
    circle(x, y, index % 7 ? .012 : .024, index % 3 ? '#77a4b764' : '#f5d7a494')
  }
  // Painted left-hand launch chute; the two raised rails are real colliders.
  for (const lane of pinballLanes) {
    line(lane.points, '#0b1026', lane.width * sx + 28)
    line(lane.points, '#87638d', lane.width * sx + 10)
    line(lane.points, '#434166', lane.width * sx)
    line(lane.points, '#a492aa', 4)
  }
  // Central rank wheel.
  circle(-.05, -1.2, 1.5, '#0d1e32', '#527392')
  circle(-.05, -1.2, 1.22, '#264e67', '#768ba7')
  const core = ctx.createRadialGradient(...point(-.05, -1.2), 3, ...point(-.05, -1.2), 105)
  core.addColorStop(0, '#f37c5280'); core.addColorStop(.3, '#486c8480'); core.addColorStop(1, '#10233f')
  circle(-.05, -1.2, .99, core)
  for (let index = 0; index < 12; index++) {
    const angle = index * Math.PI / 6
    circle(-.05 + Math.cos(angle) * 1.35, -1.2 + Math.sin(angle) * 1.35, .095, index % 3 === 0 ? '#d1b148' : '#203c55', '#15202c')
  }
  circle(-.05, -1.2, .18, '#df7854', '#e7bc8d')
  label('CADET', -.05, -.65, 26, '#90acb7'); label('RANK', -.05, -1.85, 18, '#90acb7')
  // Rocket and plasma fins around the flipper area.
  polygon([[-.05, -5.9], [-.36, -4.5], [-.24, -3.8], [-.05, -3.45], [.14, -3.8], [.28, -4.5]], '#d4b88f', '#47567b')
  polygon([[-.25, -4.6], [-1.85, -3.2], [-.7, -5.4]], '#593e8e', '#8e6dba')
  polygon([[.2, -4.6], [1.75, -3.2], [.6, -5.4]], '#593e8e', '#8e6dba')
  polygon([[-.19, -5.2], [-.05, -6.25], [.1, -5.2]], '#e16f50')
  circle(-.05, -4.3, .12, '#68b7cf', '#283f60')
  for (const side of [-1, 1]) {
    polygon([[side * 1.8, -3.85], [side * 2.4, -2.55], [side * 2.95, -3.75]], '#24273c', '#ce5348')
    for (let index = 0; index < 3; index++) circle(side * (2 + index * .2), -3.5, .055, '#82b9d2')
    line([[side * 4.15, -5.9], [side * 3.3, -5.9], [side * 2.25, -4.75]], '#a5a5a0', 10)
  }
  label('LAUNCH', -2.65, 2.5, 19, '#ddd6bd', -.65)
  label('RETURN', 2.3, 3.1, 17, '#e3d294', 1.35)
  label('HYPERSPACE', -2.6, -2.45, 16, '#b9a0c6', -.7)
  label('FUEL', 2.1, .25, 18, '#d9cc76', -Math.PI / 2)
  label('SPACE CADET', -.1, -6.55, 27, '#b3bdbe')
  label('NANDOS • RECREATION', -.1, -6.9, 12, '#7f929e')
  // Upper rollover lamps and painted direction arrows.
  for (let index = 0; index < 3; index++) {
    const x = -.7 + index * .48
    line([[x, 5.65], [x, 6.1]], '#ac8e6e', 7); circle(x, 5.75, .08, '#daa04c')
  }
  for (const [x, y, rotation] of [[-1, .9, -.4], [1.9, 1.6, .2], [-2.2, -.2, -.5]]) {
    const points: [number, number][] = [[-.14, -.25], [.14, -.25], [.14, 0], [.3, 0], [0, .42], [-.3, 0], [-.14, 0]]
    polygon(points.map(([px, py]) => [x + px * Math.cos(rotation) - py * Math.sin(rotation), y + px * Math.sin(rotation) + py * Math.cos(rotation)]), '#b5ad24', '#1a2437')
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
  return texture
}
