import { afterEach, describe, expect, it } from 'vitest'
import { BALL_START, PLUNGER_STROKE, SHOOTER_EXIT, FLIPPER_REST, flipperAngle } from '../domain/pinball'
import { PinballEngine } from './pinball-engine'
let engines: PinballEngine[] = []
const create = () => { const engine = new PinballEngine(); engines.push(engine); return engine }
function advance(engine: PinballEngine, seconds: number, delta = 1 / 60) { for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += delta) engine.advance(delta) }
function launch(engine: PinballEngine) { engine.inputs.launch = true; advance(engine, 1.2); engine.inputs.launch = false; advance(engine, .12) }
afterEach(() => { for (const engine of engines) engine.dispose(); engines = [] })
describe('Pinball real physics', () => {
  it('parks the ball, charges and launches only on release', () => {
    const engine = create(); advance(engine, 1)
    expect(engine.ball.translation().y).toBeCloseTo(BALL_START.y)
    engine.inputs.launch = true; advance(engine, .6)
    expect(engine.snapshot().charge).toBeCloseTo(.5)
    expect(engine.snapshot().shots).toBe(0)
    expect(engine.launcherCompression()).toBeCloseTo(.5)
    engine.inputs.launch = false; engine.advance(1 / 120)
    expect(engine.snapshot().shots).toBe(0)
    advance(engine, .12)
    expect(engine.snapshot().shots).toBe(1)
    expect(engine.ball.linvel().y).toBeGreaterThan(12)
    engine.inputs.launch = true; advance(engine, .2); engine.inputs.launch = false; advance(engine, .2)
    expect(engine.snapshot().shots).toBe(1)
  })
  it('leaves the launch lane and reaches the playfield', () => {
    const engine = create(); launch(engine)
    let entered = false
    for (let i = 0; i < 360; i++) { engine.advance(1 / 120); const p = engine.ball.translation(); if (p.x < 3 && p.y > 0) entered = true }
    expect(entered).toBe(true)
  })
  it('recovers weak launches that fall back down the launch lane', () => {
    const engine = create(); launch(engine)
    engine.ball.setTranslation({ x: 4, y: -5.8, z: .3 }, true)
    engine.ball.setLinvel({ x: 0, y: -2, z: 0 }, true); engine.advance(1 / 120)
    expect(engine.snapshot()).toMatchObject({ ready: true, drains: 0 })
  })
  it('keeps the new table playable at different launch strengths', () => {
    for (const charge of [.75, .9, 1.05, 1.2]) {
      const engine = create()
      engine.inputs.launch = true; advance(engine, charge); engine.inputs.launch = false; advance(engine, .12)
      let deployed = false
      for (let step = 0; step < 45 * 120 && !engine.snapshot().ready; step++) { engine.advance(1 / 120); deployed ||= engine.hasEnteredPlayfield }
      expect(deployed, 'launch must enter the playfield at ' + charge).toBe(true)
      expect(engine.snapshot().ready, 'ball must return after charge ' + charge + ': ' + JSON.stringify(engine.ball.translation())).toBe(true)
      expect(engine.snapshot().drains).toBe(1)
    }
  })
  it('lets genuinely weak shots return for another try without losing the ball', () => {
    for (const duration of [.06, .2, .4, .55]) {
      const engine = create()
      engine.inputs.launch = true; advance(engine, duration)
      engine.inputs.launch = false; advance(engine, .12)
      for (let i = 0; i < 15 * 120 && !engine.snapshot().ready; i++) engine.advance(1 / 120)
      expect(engine.snapshot(), 'weak shot ' + duration).toMatchObject({ ready: true, shots: 1, drains: 0 })
      expect(engine.hasEnteredPlayfield).toBe(false)
    }
  })
  it('moves the ball with the plunger and cancels a released spring before impact', () => {
    const engine = create()
    engine.inputs.launch = true; advance(engine, .6)
    expect(engine.ball.translation().y).toBeCloseTo(BALL_START.y - PLUNGER_STROKE * .5)
    engine.inputs.launch = false; advance(engine, .04)
    expect(engine.launcherCompression()).toBeGreaterThan(0)
    expect(engine.launcherCompression()).toBeLessThan(.5)
    engine.releaseControls(); advance(engine, .2)
    expect(engine.snapshot().shots).toBe(0)
    expect(engine.launcherCompression()).toBe(0)
    expect(engine.ball.translation().y).toBeCloseTo(BALL_START.y)
  })
  it('closes the physical gate after deployment and blocks travel back into the lane', () => {
    const engine = create(); launch(engine)
    for (let i = 0; i < 5 * 120 && !engine.hasEnteredPlayfield; i++) engine.advance(1 / 120)
    expect(engine.hasEnteredPlayfield).toBe(true)
    advance(engine, .4)
    engine.ball.setTranslation({ x: SHOOTER_EXIT.x + SHOOTER_EXIT.dx * .8, y: SHOOTER_EXIT.y + SHOOTER_EXIT.dy * .8, z: .3 }, true)
    engine.ball.setLinvel({ x: -SHOOTER_EXIT.dx * 6, y: -SHOOTER_EXIT.dy * 6, z: 0 }, true)
    advance(engine, .25)
    const position = engine.ball.translation()
    const progress = (position.x - SHOOTER_EXIT.x) * SHOOTER_EXIT.dx + (position.y - SHOOTER_EXIT.y) * SHOOTER_EXIT.dy
    expect(progress).toBeGreaterThan(.15)
  })
  it('uses a fixed timestep independent of rendering frequency', () => {
    const first = create(); const second = create(); launch(first); launch(second)
    advance(first, .5, 1 / 30); advance(second, .5, 1 / 120)
    expect(first.ball.translation().y).toBeCloseTo(second.ball.translation().y, 4)
    expect(first.ball.translation().x).toBeCloseTo(second.ball.translation().x, 4)
  })
  it('stops fast balls at rails instead of tunnelling through them', () => {
    const engine = create(); launch(engine)
    engine.ball.setTranslation({ x: -3.8, y: 0, z: .3 }, true)
    engine.ball.setLinvel({ x: -24, y: 0, z: 0 }, true)
    advance(engine, .1)
    expect(engine.ball.translation().x).toBeGreaterThan(-4.5)
    expect(engine.ball.linvel().x).toBeGreaterThan(0)
  })
  it('moves both flippers simultaneously and strikes the ball upwards', () => {
    const engine = create(); launch(engine)
    engine.ball.setTranslation({ x: -1.1, y: -4.7, z: .3 }, true)
    engine.ball.setLinvel({ x: 0, y: -1, z: 0 }, true)
    engine.inputs.left = true; engine.inputs.right = true; advance(engine, .08)
    expect(engine.ball.linvel().y).toBeGreaterThan(2)
    const rotation = engine.flippers[0].rotation()
    expect(2 * Math.atan2(rotation.z, rotation.w)).toBeGreaterThan(0)
    engine.releaseControls(); advance(engine, .2)
    const rest = engine.flippers[0].rotation()
    expect(2 * Math.atan2(rest.z, rest.w)).toBeCloseTo(flipperAngle(0, FLIPPER_REST))
  })
  it('returns a lost ball to the launcher, releases controls and resets the trial', () => {
    const engine = create(); launch(engine)
    engine.ball.setTranslation({ x: 0, y: -7.4, z: .3 }, true); engine.ball.setLinvel({ x: 0, y: -2, z: 0 }, true); engine.advance(1 / 120)
    expect(engine.snapshot()).toMatchObject({ ready: true, drains: 1, shots: 1 })
    expect(engine.ball.translation().x).toBeCloseTo(4)
    engine.inputs.launch = true; advance(engine, .4); engine.releaseControls(); advance(engine, .1)
    expect(engine.snapshot().shots).toBe(1)
    engine.reset(); expect(engine.snapshot()).toEqual({ ready: true, charge: 0, shots: 0, drains: 0, hits: 0 })
    engine.dispose(); engine.dispose(); expect(() => engine.advance(1)).not.toThrow()
  })
})
