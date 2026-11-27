import RAPIER from '@dimforge/rapier3d/rapier.js'
import {
  BALL_RADIUS, BALL_START, FLIPPER_LENGTH, FLIPPER_PIVOTS, FLIPPER_RADIUS, FLIPPER_REST,
  FLIPPER_UP, FLIPPER_Y, LANE_RAIL_RADIUS, ORBIT_CROSSING, ORBIT_ENTRY, PLUNGER_STROKE,
  SHOOTER_EXIT, SHOOTER_GATE, SHOOTER_WIDTH, TARGET_FACE_CENTERS, TARGET_FACE_OFFSET,
  TARGET_FACE_WIDTH, TARGET_THICKNESS, TARGET_WIDTH,
  distanceToRail, flipperAngle, pathRails, pinballBumpers, pinballCabinet, pinballGuidePaths,
  pinballSlings, pinballTargets, railGeometry, rotationZ,
} from '../domain/pinball'
import type { PinballInputs, PinballSnapshot } from '../domain/pinball'
import { createPinballGame, pinballGameEvent } from '../domain/pinball-game'
import type { PinballEvent, PinballMode } from '../domain/pinball-game'

const STEP = 1 / 120
const GATE_RADIUS = .035
const GATE_CLEARANCE = SHOOTER_GATE.length + GATE_RADIUS + BALL_RADIUS + .07
/** Fixed-step XY physics; the upper orbit is a continuous guide in the playfield plane. */
export class PinballEngine {
  readonly world = new RAPIER.World({ x: 0, y: -7.8, z: 0 })
  readonly ball: RAPIER.RigidBody
  readonly flippers: RAPIER.RigidBody[]
  readonly gate: RAPIER.RigidBody
  readonly inputs: PinballInputs = { left: false, right: false, launch: false }
  private readonly events = new RAPIER.EventQueue(true)
  private readonly contacts = new Map<number, { kind: 'bumper' | 'target' | 'sling' | 'orbit-entry' | 'orbit-crossing'; index: number }>()
  private readonly flashUntil = new Map<string, number>()
  private readonly lastContact = new Map<string, number>()
  private readonly mode: PinballMode
  private stationary = 0
  private elapsed = 0
  private orbitProgress: 'untouched' | 'entered' | 'crossed' = 'untouched'
  private game = createPinballGame()
  private readonly angles = [FLIPPER_REST, FLIPPER_REST]
  private accumulator = 0
  private ready = true
  private charge = 0
  private wasCharging = false
  private shots = 0
  private drains = 0
  private hits = 0
  private disposed = false
  private pendingCharge: number | null = null
  private returnTime = 0
  private deployed = false
  private gateLatched = false
  private gateRotation = SHOOTER_GATE.angle
  get hasEnteredPlayfield() { return this.deployed }
  launcherCompression() { return this.pendingCharge === null ? this.charge : this.pendingCharge * (1 - Math.min(1, this.returnTime / .085) ** 2) }
  constructor(mode: PinballMode = 'classic') {
    this.mode = mode
    this.game = createPinballGame(mode)
    this.world.timestep = STEP
    this.world.integrationParameters.maxCcdSubsteps = 4
    for (const rail of pathRails(pinballCabinet)) {
      const { x, y, length, angle } = railGeometry(rail)
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(length / 2, .12, .6).setTranslation(x, y, .3).setRotation(rotationZ(angle)).setRestitution(.65).setFriction(.1))
    }
    for (const rail of pinballGuidePaths.flatMap(pathRails)) {
      const { x, y, length, angle } = railGeometry(rail)
      this.world.createCollider(RAPIER.ColliderDesc.capsule(length / 2, LANE_RAIL_RADIUS).setTranslation(x, y, .3).setRotation(rotationZ(angle - Math.PI / 2)).setRestitution(.08).setFriction(.015))
    }
    this.gate = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(SHOOTER_GATE.x, SHOOTER_GATE.y, .3).setRotation(rotationZ(SHOOTER_GATE.angle)))
    this.world.createCollider(RAPIER.ColliderDesc.capsule(SHOOTER_GATE.length / 2, GATE_RADIUS).setTranslation(SHOOTER_GATE.length / 2, 0, 0).setRotation(rotationZ(-Math.PI / 2)).setRestitution(.2), this.gate)
    for (const [index, bumper] of pinballBumpers.entries()) {
      const collider = this.world.createCollider(RAPIER.ColliderDesc.ball(bumper.radius).setTranslation(bumper.x, bumper.y, .3).setRestitution(1.15).setFriction(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS))
      this.contacts.set(collider.handle, { kind: 'bumper', index })
    }
    for (const [index, target] of pinballTargets.entries()) {
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(TARGET_WIDTH / 2, TARGET_THICKNESS / 2, .35)
        .setTranslation(target.x, target.y, .3).setRotation(rotationZ(target.angle)).setRestitution(.65))
      for (const offset of TARGET_FACE_CENTERS) {
        const x = target.x + offset * Math.cos(target.angle) - TARGET_FACE_OFFSET * Math.sin(target.angle)
        const y = target.y + offset * Math.sin(target.angle) + TARGET_FACE_OFFSET * Math.cos(target.angle)
        const face = this.world.createCollider(RAPIER.ColliderDesc.cuboid(TARGET_FACE_WIDTH / 2, .085, .35)
          .setTranslation(x, y, .3).setRotation(rotationZ(target.angle)).setRestitution(.8)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS))
        this.contacts.set(face.handle, { kind: 'target', index })
      }
    }
    for (const [index, sling] of pinballSlings.entries()) {
      const vertices = new Float32Array([-.2, .6].flatMap((z) => sling.points.flatMap(([x, y]) => [x, y, z])))
      const shape = RAPIER.ColliderDesc.convexHull(vertices)!
      const collider = this.world.createCollider(shape.setRestitution(.95).setFriction(.1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS))
      this.contacts.set(collider.handle, { kind: 'sling', index })
    }
    for (const [index, point] of [ORBIT_ENTRY, ORBIT_CROSSING].entries()) {
      const sensor = this.world.createCollider(RAPIER.ColliderDesc.ball(.34).setTranslation(point.x, point.y, .3).setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS))
      this.contacts.set(sensor.handle, { kind: index === 0 ? 'orbit-entry' : 'orbit-crossing', index })
    }
    this.flippers = FLIPPER_PIVOTS.map((x, side) => {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, FLIPPER_Y, .3).setRotation(rotationZ(flipperAngle(side as 0 | 1, FLIPPER_REST))))
      this.world.createCollider(RAPIER.ColliderDesc.capsule(FLIPPER_LENGTH / 2 - FLIPPER_RADIUS, FLIPPER_RADIUS)
        .setTranslation(FLIPPER_LENGTH / 2, 0, 0).setRotation(rotationZ(-Math.PI / 2)).setRestitution(.8).setFriction(.2), body)
      return body
    })
    this.ball = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(BALL_START.x, BALL_START.y, BALL_START.z).setGravityScale(0).setLinearDamping(.035).setCcdEnabled(true).enabledTranslations(true, true, false).lockRotations())
    this.world.createCollider(RAPIER.ColliderDesc.ball(BALL_RADIUS).setRestitution(.5).setFriction(.08).setDensity(1), this.ball)
  }
  snapshot(): PinballSnapshot { return { ready: this.ready, charge: this.charge, shots: this.shots, drains: this.drains, hits: this.hits, game: this.game } }
  light(kind: string, index: number) { return Math.max(0, Math.min(1, ((this.flashUntil.get(kind + index) ?? 0) - this.elapsed) / .2)) }
  private award(event: PinballEvent) { this.game = pinballGameEvent(this.game, event) }
  releaseControls() { this.inputs.left = false; this.inputs.right = false; this.inputs.launch = false; this.wasCharging = false; this.charge = 0; this.pendingCharge = null; this.returnTime = 0; if (this.ready) this.ball.setTranslation(BALL_START, true) }
  private parkBall() {
    this.ball.setTranslation(BALL_START, true); this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.ball.setGravityScale(0, true); this.ready = this.game.phase !== 'over'; this.charge = 0; this.wasCharging = false; this.pendingCharge = null; this.deployed = false; this.gateLatched = false; this.orbitProgress = 'untouched'; this.stationary = 0
  }
  reset() { this.game = createPinballGame(this.mode); this.releaseControls(); this.parkBall(); this.flashUntil.clear(); this.lastContact.clear(); this.elapsed = 0; this.shots = 0; this.drains = 0; this.hits = 0; this.accumulator = 0 }
  advance(seconds: number) {
    if (this.disposed || !Number.isFinite(seconds) || seconds <= 0) return
    this.accumulator += Math.min(seconds, .1)
    while (this.accumulator + 1e-9 >= STEP) { this.step(); this.accumulator -= STEP }
  }
  private step() {
    if (this.game.phase === 'over') return
    this.elapsed += STEP
    if (this.ready) {
      if (this.pendingCharge !== null) {
        this.returnTime += STEP
        if (this.returnTime >= .085) {
          const strength = this.pendingCharge
          this.pendingCharge = null; this.ready = false; this.charge = 0
          this.ball.setTranslation(BALL_START, true); this.ball.setGravityScale(1, true)
          this.ball.setLinvel({ x: 0, y: 7 + 13 * strength, z: 0 }, true); this.shots++; this.award({ type: 'launch' })
        }
      } else if (this.inputs.launch) {
        this.charge = Math.min(1, this.charge + STEP / 1.2); this.wasCharging = true
      } else if (this.wasCharging) {
        this.pendingCharge = this.charge; this.returnTime = 0; this.wasCharging = false; this.charge = 0
      }
      if (this.ready) this.ball.setTranslation({ ...BALL_START, y: BALL_START.y - this.launcherCompression() * PLUNGER_STROKE }, true)
    }
    const p = this.ball.translation()
    const dx = p.x - SHOOTER_EXIT.x, dy = p.y - SHOOTER_EXIT.y
    const progress = dx * SHOOTER_EXIT.dx + dy * SHOOTER_EXIT.dy
    const across = Math.abs(-dx * SHOOTER_EXIT.dy + dy * SHOOTER_EXIT.dx)
    if (!this.ready && !this.deployed && this.orbitProgress === 'crossed' && progress > .28 && progress < 1.1 && across < SHOOTER_WIDTH / 2) {
      this.deployed = true
      this.award({ type: 'orbit' })
    }
    if (this.deployed && progress > 0 && Math.hypot(p.x - SHOOTER_GATE.x, p.y - SHOOTER_GATE.y) > GATE_CLEARANCE) this.gateLatched = true
    const openGate = !this.ready && !this.gateLatched && this.orbitProgress === 'crossed'
    const gateTarget = SHOOTER_GATE.angle - (openGate ? Math.PI / 2 : 0)
    this.gateRotation += Math.max(-.12, Math.min(.12, gateTarget - this.gateRotation))
    this.gate.setNextKinematicRotation(rotationZ(this.gateRotation))
    for (const side of [0, 1] as const) {
      const target = this.inputs[side === 0 ? 'left' : 'right'] ? FLIPPER_UP : FLIPPER_REST
      // A ball resting on the fixed IN guide may be asleep even as the flipper drops away.
      if (target === FLIPPER_REST && this.angles[side] > FLIPPER_REST && this.ball.isSleeping()) this.ball.wakeUp()
      this.angles[side] += Math.max(-.12, Math.min(.12, target - this.angles[side]))
      this.flippers[side].setNextKinematicRotation(rotationZ(flipperAngle(side, this.angles[side])))
    }
    this.world.step(this.events)
    this.events.drainCollisionEvents((first, second, started) => {
      if (!started || this.ready || this.game.phase === 'over') return
      const ball = this.ball.collider(0).handle
      if (first !== ball && second !== ball) return
      const handle = first === ball ? second : first, contact = this.contacts.get(handle)
      if (!contact) return
      const { kind, index } = contact
      const contactKey = kind + index
      if (this.elapsed - (this.lastContact.get(contactKey) ?? -Infinity) < .12) return
      this.lastContact.set(contactKey, this.elapsed)
      if (kind === 'bumper' || kind === 'sling') {
        const p = this.ball.translation()
        let dx: number, dy: number
        if (kind === 'sling') {
          const { active, normal } = pinballSlings[index]
          const outside = (p.x - active.from[0]) * normal[0] + (p.y - active.from[1]) * normal[1]
          if (outside <= 0 || distanceToRail([p.x, p.y], active) > BALL_RADIUS + .12) return
          dx = normal[0]
          dy = normal[1]
        } else {
          const center = pinballBumpers[index]
          dx = p.x - center.x; dy = p.y - center.y
        }
        const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length
        const velocity = this.ball.linvel(), kick = Math.max(0, (kind === 'bumper' ? 11 : 9) - velocity.x * dx - velocity.y * dy)
        this.ball.setLinvel({ x: velocity.x + dx * kick, y: velocity.y + dy * kick, z: 0 }, true)
        if (kind === 'bumper') { this.hits++; this.award({ type: 'bumper' }) }
        else this.award({ type: 'sling' })
        this.flashUntil.set(contactKey, this.elapsed + .2)
      } else if (kind === 'target') {
        this.flashUntil.set(contactKey, this.elapsed + .2)
        this.award({ type: 'target', bank: index === 0 ? 0 : 1 })
      }
      else if (kind === 'orbit-entry' && this.ball.linvel().y > 0) this.orbitProgress = 'entered'
      else if (kind === 'orbit-crossing' && this.orbitProgress === 'entered' && this.ball.linvel().x < 0) this.orbitProgress = 'crossed'
    })
    const velocity = this.ball.linvel()
    const speed = Math.hypot(velocity.x, velocity.y)
    if (speed > 24) this.ball.setLinvel({ x: velocity.x * 24 / speed, y: velocity.y * 24 / speed, z: 0 }, true)
    const position = this.ball.translation()
    const inShooter = Math.abs(position.x - BALL_START.x) < SHOOTER_WIDTH / 2
    if (!this.ready && !this.deployed && inShooter && position.y < BALL_START.y - .02 && velocity.y < 0) { this.award({ type: 'recover' }); this.parkBall() }
    else if (!this.ready && (position.y < -7.3 || Math.abs(position.x) > 6 || position.y > 9)) { this.drains++; this.award({ type: 'drain' }); this.parkBall() }
    // A ball held at a raised flipper is still under player control.
    const cradled = Math.abs(position.y - FLIPPER_Y) < FLIPPER_LENGTH * Math.sin(FLIPPER_UP) + BALL_RADIUS
      && FLIPPER_PIVOTS.some((x, side) => this.inputs[side === 0 ? 'left' : 'right']
        && (position.x - x) * (side === 0 ? 1 : -1) > -.25 && Math.abs(position.x - x) < FLIPPER_LENGTH)
    this.stationary = !this.ready && !cradled && speed < .16 ? this.stationary + STEP : 0
    if (this.stationary > 4) { this.award({ type: 'recover' }); this.parkBall() }
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.events.free(); this.world.free() }
}
