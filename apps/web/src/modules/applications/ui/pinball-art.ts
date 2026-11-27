import { CanvasTexture, SRGBColorSpace } from 'three'
import { BALL_START, FIELD_CENTER, SHOOTER_WIDTH, TABLE_HEIGHT, TABLE_WIDTH, pinballCabinet, pinballReturnLanes, pinballShooterPath } from '../domain/pinball'

/** Original procedural playfield artwork; no original game bitmap is embedded. */
export function createPinballArtwork() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 1536
  const ctx = canvas.getContext('2d')!
  const sx = canvas.width / TABLE_WIDTH, sy = canvas.height / TABLE_HEIGHT
  const point = (x: number, y: number): [number, number] => [(x + TABLE_WIDTH / 2) * sx, (TABLE_HEIGHT / 2 - y) * sy]
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
  ctx.beginPath()
  pinballCabinet.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(...point(x, y))
    else ctx.lineTo(...point(x, y))
  })
  ctx.closePath()
  ctx.clip()
  const background = ctx.createLinearGradient(0, 0, 1024, 1536)
  background.addColorStop(0, '#0b1331'); background.addColorStop(.52, '#11284b'); background.addColorStop(1, '#0b1738')
  ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 1536)
  // Hexagonal armour pattern, kept subdued so the ball remains legible.
  for (let row = 0; row < 27; row++) for (let column = 0; column < 16; column++) {
    const x = -4.8 + column * .65 + row % 2 * .325, y = -7.2 + row * .57
    const vertices = Array.from({ length: 6 }, (_, index): [number, number] => [x + Math.cos(index * Math.PI / 3) * .32, y + Math.sin(index * Math.PI / 3) * .32])
    line(vertices, '#38648232', 2, true)
  }
  for (let index = 0; index < 100; index++) {
    const x = Math.sin(index * 137.31) * 4.1, y = Math.sin(index * 49.71 + 1) * 6.5
    circle(x, y, index % 7 ? .012 : .024, index % 3 ? '#77a4b764' : '#f5d7a494')
  }
  line(pinballShooterPath, '#2f253c', SHOOTER_WIDTH * sx + 13)
  line(pinballShooterPath, '#523f49', SHOOTER_WIDTH * sx)
  line(pinballShooterPath, '#8c6655', 4)
  for (const x of [-1.75, 0, 1.75]) label('≪', x, 5.93, 34, '#ffe2a0')
  for (const y of [-3.4, -1.34, .72, 2.78]) label('≪', BALL_START.x + .12, y, 34, '#ffe2a0', Math.PI / 2)

  circle(FIELD_CENTER, 2.58, 1.82, '#7559ae12', '#5863a8')
  circle(FIELD_CENTER, 2.58, 1.52, '#7559ae0a', '#3c4d83')
  polygon([[FIELD_CENTER - .84, 5.05], [FIELD_CENTER + .84, 5.05], [FIELD_CENTER + .84, 4.53], [FIELD_CENTER - .84, 4.53]], '#2a1c53', '#e5bc7f')
  label('← ÓRBITA', FIELD_CENTER, 4.69, 22, '#fff0bb')

  const rocket = (points: [number, number][], fill: string, stroke?: string) =>
    polygon(points.map(([x, y]) => [FIELD_CENTER + x, y]), fill, stroke)
  ctx.save()
  ctx.translate(...point(FIELD_CENTER, -1.76))
  ctx.rotate(-.39)
  ctx.beginPath()
  ctx.ellipse(0, 0, 171, 29, 0, 0, Math.PI * 2)
  ctx.strokeStyle = '#a273e5'
  ctx.lineWidth = 7
  ctx.stroke()
  ctx.restore()
  rocket([[-.3, -1.62], [-.72, -2.3], [-.65, -2.89], [-.2, -2.4], [.2, -2.4], [.65, -2.89], [.72, -2.3], [.3, -1.62]], '#7749ab', '#bf92df')
  rocket([[0, .21], [-.25, -.25], [-.38, -1], [-.28, -1.87], [-.15, -2.47], [.15, -2.47], [.28, -1.87], [.38, -1], [.25, -.25]], '#e9cdab', '#f8e9c6')
  rocket([[0, .21], [-.25, -.25], [.25, -.25]], '#bc3155')
  rocket([[-.12, -2.42], [0, -3.17], [.12, -2.42], [0, -1.58]], '#e24464', '#f8a2a1')
  circle(FIELD_CENTER, -.83, .165, '#99e8f7', '#3c617c')
  label('⋯ SPACE CADET ⋯', FIELD_CENTER, -3.55, 30, '#efcfaa')

  pinballReturnLanes.forEach(({ divider }, index) => {
    const x = divider.at(-1)![0]
    const side = index === 0 ? -1 : 1
    for (const [name, laneX] of [['OUT', x + side * .52], ['IN', x - side * .47]] as const) {
      label(name, laneX, -5.75, 18, '#ffe2a0')
      label('LANE', laneX, -6.04, 16, '#ffe2a0')
      label('▼', laneX, -6.45, 23, '#ffe2a0')
    }
  })
  label('NANDOS  •  RECREACIÓN', FIELD_CENTER, -6.78, 15, '#bfa4d8')
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
  return texture
}
