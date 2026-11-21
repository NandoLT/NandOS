import RAPIER from '@dimforge/rapier3d/rapier.js'
import { BALL_RADIUS, BALL_START, PLUNGER_STROKE, SHOOTER_EXIT, SHOOTER_GATE, FLIPPER_LENGTH, FLIPPER_PIVOTS, FLIPPER_REST, FLIPPER_UP, FLIPPER_Y, flipperAngle, pinballBumpers, pinballLaneRails, pinballRails, pinballTargets, railGeometry, rotationZ } from '../domain/pinball'
import type { PinballInputs, PinballSnapshot } from '../domain/pinball'

const STEP = 1 / 120
/** Fixed-step XY physics. Depth is visual in this prototype; ramps come later. */
export class PinballEngine {
  readonly world = new RAPIER.World({ x: 0, y: -7.8, z: 0 })
  readonly ball: RAPIER.RigidBody
  readonly flippers: RAPIER.RigidBody[]
  readonly gate: RAPIER.RigidBody
  readonly inputs: PinballInputs = { left: false, right: false, launch: false }
  private readonly events = new RAPIER.EventQueue(true)
  private readonly bumpers = new Set<number>()
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
  constructor() {
    this.world.timestep = STEP
    this.world.integrationParameters.maxCcdSubsteps = 4
    for (const rail of pinballRails) {
      const { x, y, length, angle } = railGeometry(rail)
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(length / 2, .12, .6).setTranslation(x, y, .3).setRotation(rotationZ(angle)).setRestitution(.65).setFriction(.1))
    }
    for (const rail of pinballLaneRails) {
      const { x, y, length, angle } = railGeometry(rail)
      this.world.createCollider(RAPIER.ColliderDesc.capsule(length / 2, .09).setTranslation(x, y, .3).setRotation(rotationZ(angle - Math.PI / 2)).setRestitution(.08).setFriction(.015))
    }
    this.gate = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(SHOOTER_GATE.x, SHOOTER_GATE.y, .3).setRotation(rotationZ(SHOOTER_GATE.angle)))
    this.world.createCollider(RAPIER.ColliderDesc.capsule(SHOOTER_GATE.length / 2, .035).setTranslation(SHOOTER_GATE.length / 2, 0, 0).setRotation(rotationZ(-Math.PI / 2)).setRestitution(.2), this.gate)
    for (const bumper of pinballBumpers) {
      const collider = this.world.createCollider(RAPIER.ColliderDesc.ball(bumper.radius).setTranslation(bumper.x, bumper.y, .3).setRestitution(1.15).setFriction(0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS))
      this.bumpers.add(collider.handle)
    }
    for (const target of pinballTargets) {
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(.13, .09, .35).setTranslation(target.x, target.y, .3).setRotation(rotationZ(target.angle)).setRestitution(.8))
    }
    this.flippers = FLIPPER_PIVOTS.map((x, side) => {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, FLIPPER_Y, .3).setRotation(rotationZ(flipperAngle(side as 0 | 1, FLIPPER_REST))))
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(FLIPPER_LENGTH / 2, .14, .3).setTranslation(FLIPPER_LENGTH / 2, 0, 0).setRestitution(.8).setFriction(.2), body)
      return body
    })
    this.ball = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(BALL_START.x, BALL_START.y, BALL_START.z).setGravityScale(0).setLinearDamping(.035).setCcdEnabled(true).enabledTranslations(true, true, false).lockRotations())
    this.world.createCollider(RAPIER.ColliderDesc.ball(BALL_RADIUS).setRestitution(.5).setFriction(.08).setDensity(1), this.ball)
  }
  snapshot(): PinballSnapshot { return { ready: this.ready, charge: this.charge, shots: this.shots, drains: this.drains, hits: this.hits } }
  releaseControls() { this.inputs.left = false; this.inputs.right = false; this.inputs.launch = false; this.wasCharging = false; this.charge = 0; this.pendingCharge = null; this.returnTime = 0; if (this.ready) this.ball.setTranslation(BALL_START, true) }
  private parkBall() {
    this.ball.setTranslation(BALL_START, true); this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.ball.setGravityScale(0, true); this.ready = true; this.charge = 0; this.wasCharging = false; this.pendingCharge = null; this.deployed = false; this.gateLatched = false
  }
  reset() { this.releaseControls(); this.parkBall(); this.shots = 0; this.drains = 0; this.hits = 0; this.accumulator = 0 }
  advance(seconds: number) {
    if (this.disposed || !Number.isFinite(seconds) || seconds <= 0) return
    this.accumulator += Math.min(seconds, .1)
    while (this.accumulator + 1e-9 >= STEP) { this.step(); this.accumulator -= STEP }
  }
  private step() {
    if (this.ready) {
      if (this.pendingCharge !== null) {
        this.returnTime += STEP
        if (this.returnTime >= .085) {
          const strength = this.pendingCharge
          this.pendingCharge = null; this.ready = false; this.charge = 0
          this.ball.setTranslation(BALL_START, true); this.ball.setGravityScale(1, true)
          this.ball.setLinvel({ x: 0, y: 7 + 13 * strength, z: 0 }, true); this.shots++
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
    if (!this.ready && !this.deployed && progress > .4 && progress < 1.5 && across < .8) this.deployed = true
    if (this.deployed && progress > .85) this.gateLatched = true
    const openGate = !this.ready && !this.gateLatched && Math.hypot(dx, dy) < 2.1
    const gateTarget = SHOOTER_GATE.angle - (openGate ? Math.PI / 2 : 0)
    this.gateRotation += Math.max(-.12, Math.min(.12, gateTarget - this.gateRotation))
    this.gate.setNextKinematicRotation(rotationZ(this.gateRotation))
    for (const side of [0, 1] as const) {
      const target = this.inputs[side === 0 ? 'left' : 'right'] ? FLIPPER_UP : FLIPPER_REST
      this.angles[side] += Math.max(-.12, Math.min(.12, target - this.angles[side]))
      this.flippers[side].setNextKinematicRotation(rotationZ(flipperAngle(side, this.angles[side])))
    }
    this.world.step(this.events)
    this.events.drainCollisionEvents((first, second, started) => { if (started && (this.bumpers.has(first) || this.bumpers.has(second))) this.hits++ })
    const velocity = this.ball.linvel()
    const speed = Math.hypot(velocity.x, velocity.y)
    if (speed > 24) this.ball.setLinvel({ x: velocity.x * 24 / speed, y: velocity.y * 24 / speed, z: 0 }, true)
    const position = this.ball.translation()
    if (!this.ready && position.x > 3.6 && position.y < -5.72 && velocity.y < 0) { this.parkBall() }
    else if (!this.ready && (position.y < -7.3 || Math.abs(position.x) > 6 || position.y > 9)) { this.drains++; this.parkBall() }
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.events.free(); this.world.free() }
}
