import { afterEach, describe, expect, it } from 'vitest'
import { BALL_START, FLIPPER_REST, flipperAngle } from '../domain/pinball'
import { PinballEngine } from './pinball-engine'
let engines: PinballEngine[] = []
const create = () => { const engine = new PinballEngine(); engines.push(engine); return engine }
function advance(engine: PinballEngine, seconds: number, delta = 1 / 60) { for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += delta) engine.advance(delta) }
function launch(engine: PinballEngine) { engine.inputs.launch = true; advance(engine, 1.2); engine.inputs.launch = false; engine.advance(1 / 120) }
afterEach(() => { for (const engine of engines) engine.dispose(); engines = [] })
describe('Pinball real physics', () => {
  it('parks the ball, charges and launches only on release', () => {
    const engine = create(); advance(engine, 1)
    expect(engine.ball.translation().y).toBeCloseTo(BALL_START.y)
    engine.inputs.launch = true; advance(engine, .6)
    expect(engine.snapshot().charge).toBeCloseTo(.5)
    expect(engine.snapshot().shots).toBe(0)
    engine.inputs.launch = false; engine.advance(1 / 120)
    expect(engine.snapshot().shots).toBe(1)
    expect(engine.ball.linvel().y).toBeGreaterThan(15)
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
    expect(engine.snapshot()).toMatchObject({ ready: true, drains: 1 })
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
