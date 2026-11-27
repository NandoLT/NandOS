import { afterEach, describe, expect, it } from 'vitest'
import { BALL_START, FIELD_CENTER, FLIPPER_PIVOTS, FLIPPER_REST, FLIPPER_Y, PLUNGER_STROKE, SHOOTER_EXIT, flipperAngle, pinballBumpers, pinballTargets } from '../domain/pinball'
import { createPinballGame } from '../domain/pinball-game'
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
    engine.ball.setTranslation({ ...BALL_START, y: BALL_START.y - .1 }, true)
    engine.ball.setLinvel({ x: 0, y: -2, z: 0 }, true); engine.advance(1 / 120)
    expect(engine.snapshot()).toMatchObject({ ready: true, drains: 0 })
  })
  it('keeps the new table playable at different launch strengths', () => {
    for (const charge of [.75, 106 / 120, .9, 125 / 120, 1.05, 1.2]) {
      const engine = create()
      engine.inputs.launch = true; advance(engine, charge); engine.inputs.launch = false; advance(engine, .12)
      let deployed = false
      for (let step = 0; step < 45 * 120 && !engine.snapshot().ready; step++) {
        engine.advance(1 / 120)
        deployed ||= engine.hasEnteredPlayfield
      }
      expect(deployed, 'launch must enter the playfield at ' + charge).toBe(true)
      expect(engine.snapshot().ready, 'ball must return after charge ' + charge + ': ' + JSON.stringify(engine.ball.translation())).toBe(true)
      expect(engine.snapshot().drains, 'natural drain after charge ' + charge).toBe(1)
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
  it('keeps the gate clear of the ball while closing after the orbit', () => {
    for (const steps of [79, 82, 144]) {
      const engine = create()
      engine.inputs.launch = true; advance(engine, steps / 120, 1 / 120); engine.inputs.launch = false
      let closing = false
      for (let step = 0; step < 12 * 120; step++) {
        const before = engine.gate.rotation()
        engine.advance(1 / 120)
        if (!engine.hasEnteredPlayfield) continue
        const after = engine.gate.rotation()
        if (Math.abs(after.z - before.z) < 1e-5) {
          if (closing) break
          continue
        }
        closing = true
        const p = engine.ball.translation(), hinge = engine.gate.translation()
        expect(Math.hypot(p.x - hinge.x, p.y - hinge.y)).toBeGreaterThan(1.1)
      }
      expect(closing, 'gate closes after charge ' + steps).toBe(true)
    }
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
    engine.ball.setTranslation({ x: FLIPPER_PIVOTS[0] + .95, y: FLIPPER_Y + .38, z: .3 }, true)
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
    expect(engine.ball.translation().x).toBeCloseTo(BALL_START.x)
    engine.inputs.launch = true; advance(engine, .4); engine.releaseControls(); advance(engine, .1)
    expect(engine.snapshot().shots).toBe(1)
    engine.reset(); expect(engine.snapshot()).toEqual({ ready: true, charge: 0, shots: 0, drains: 0, hits: 0, game: createPinballGame() })
    engine.dispose(); engine.dispose(); expect(() => engine.advance(1)).not.toThrow()
  })
  it('kicks slow bumper contacts and reports actual points and a fading lamp', () => {
    const engine = create(); launch(engine)
    const bumper = pinballBumpers[0]
    engine.ball.setTranslation({ x: bumper.x, y: bumper.y + .8, z: .3 }, true)
    engine.ball.setLinvel({ x: 0, y: -2, z: 0 }, true)
    for (let step = 0; step < 60 && engine.snapshot().hits === 0; step++) engine.advance(1 / 120)
    expect(engine.snapshot().game.score).toBeGreaterThanOrEqual(1000)
    expect(engine.snapshot().hits).toBeGreaterThan(0)
    expect(engine.ball.linvel().y).toBeGreaterThan(4)
    expect(engine.light('bumper', 0)).toBeGreaterThan(0)
    const hits = engine.snapshot().hits
    engine.ball.setTranslation({ x: 0, y: -1.2, z: .3 }, true)
    engine.ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    advance(engine, .3)
    expect(engine.snapshot().hits).toBe(hits)
    expect(engine.light('bumper', 0)).toBe(0)
  })
  it('completes the target objective only after hitting both physical banks', () => {
    const engine = create(); launch(engine)
    for (const [index, target] of pinballTargets.entries()) {
      const dx = Math.sin(target.angle), dy = -Math.cos(target.angle)
      engine.ball.setTranslation({ x: target.x + dx * .67, y: target.y + dy * .67, z: .3 }, true)
      engine.ball.setLinvel({ x: -dx * 5, y: -dy * 5, z: 0 }, true)
      advance(engine, .13)
      expect(engine.snapshot().game.targets).toEqual([true, index === 1])
    }
    expect(engine.snapshot().game.score).toBe(6000)
  })
  it('does not award points for striking the back of a target bank', () => {
    const engine = create(); launch(engine)
    const target = pinballTargets[0]
    const dx = -Math.sin(target.angle), dy = Math.cos(target.angle)
    engine.ball.setTranslation({ x: target.x + dx * .65, y: target.y + dy * .65, z: .3 }, true)
    engine.ball.setLinvel({ x: -dx * 5, y: -dy * 5, z: 0 }, true)
    advance(engine, .15)
    const velocity = engine.ball.linvel()
    expect(velocity.x * dx + velocity.y * dy).toBeGreaterThan(0)
    expect(engine.snapshot().game).toMatchObject({ targets: [false, false], score: 0 })
  })
  it('takes the two previously stuck launch strengths around the orbit without ball search', () => {
    for (const steps of [82, 115]) {
      const engine = create()
      engine.inputs.launch = true
      for (let step = 0; step < steps; step++) engine.advance(1 / 120)
      engine.inputs.launch = false
      for (let step = 0; step < 5 * 120 && !engine.hasEnteredPlayfield; step++) {
        engine.advance(1 / 120)
      }
      expect(engine.hasEnteredPlayfield, 'launch ' + steps + ': ' + JSON.stringify(engine.ball.translation())).toBe(true)
      expect(engine.snapshot().game).toMatchObject({ orbit: true, score: 7000 })
    }
  })
  it('does not credit the orbit merely for passing the outlet from the playfield', () => {
    const engine = create(); launch(engine)
    engine.ball.setTranslation({ x: SHOOTER_EXIT.x + SHOOTER_EXIT.dx * .6, y: SHOOTER_EXIT.y + SHOOTER_EXIT.dy * .6, z: .3 }, true)
    engine.ball.setLinvel({ x: 0, y: -3, z: 0 }, true)
    advance(engine, .12)
    expect(engine.snapshot().game.orbit).toBe(false)
  })
  it('feeds the inlanes toward the flippers and loses the ball down the outlanes', () => {
    for (const side of [-1, 1]) {
      const returning = create(); launch(returning)
      returning.ball.setTranslation({ x: FIELD_CENTER + side * 2.9, y: -3.55, z: .3 }, true)
      returning.ball.setLinvel({ x: 0, y: -4, z: 0 }, true)
      let reachedFlipper = false
      for (let step = 0; step < 120; step++) {
        returning.advance(1 / 120)
        const position = returning.ball.translation()
        if (position.y < -5.2 && position.y > -6.25 && Math.abs(position.x - FIELD_CENTER) < 1.92) reachedFlipper = true
      }
      expect(reachedFlipper, 'inlane ' + side).toBe(true)

      const draining = create(); launch(draining)
      draining.ball.setTranslation({ x: FIELD_CENTER + side * 3.9, y: -3.1, z: .3 }, true)
      draining.ball.setLinvel({ x: 0, y: -4, z: 0 }, true)
      advance(draining, 1)
      expect(draining.snapshot(), 'outlane ' + side).toMatchObject({ drains: 1, ready: true })
    }
  })
  it('can release a held flipper after the ball enters its inlane', () => {
    const engine = create()
    engine.inputs.right = true
    engine.inputs.launch = true; advance(engine, 129 / 120, 1 / 120); engine.inputs.launch = false
    advance(engine, 8)
    expect(engine.snapshot().game.orbit).toBe(true)
    expect(engine.snapshot()).toMatchObject({ ready: false, drains: 0 })
    engine.inputs.right = false
    for (let step = 0; step < 30 * 120 && engine.snapshot().drains === 0 && !engine.snapshot().ready; step++) engine.advance(1 / 120)
    expect(engine.snapshot().drains).toBe(1)
  })
  it('ends a classic game after three drained balls and resets all rules', () => {
    const engine = create()
    for (let ball = 1; ball <= 3; ball++) {
      launch(engine)
      engine.ball.setTranslation({ x: 0, y: -7.5, z: .3 }, true)
      engine.ball.setLinvel({ x: 0, y: -2, z: 0 }, true)
      engine.advance(1 / 120)
      expect(engine.snapshot().drains).toBe(ball)
    }
    expect(engine.snapshot().game.phase).toBe('over')
    launch(engine)
    expect(engine.snapshot().shots).toBe(3)
    engine.reset()
    expect(engine.snapshot().game).toEqual(createPinballGame())
  })

  it('returns a sleeping ball through ball search without consuming the current ball or score', () => {
    const engine = create(); launch(engine)
    const game = engine.snapshot().game
    engine.ball.setTranslation({ x: 0, y: 0, z: .3 }, true)
    engine.ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    engine.ball.sleep()
    advance(engine, 4.2)
    expect(engine.snapshot()).toMatchObject({ ready: true, drains: 0, game: { ball: game.ball, score: game.score, phase: 'ready' } })
  })

})
