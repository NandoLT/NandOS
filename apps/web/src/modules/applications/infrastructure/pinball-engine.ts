import RAPIER from '@dimforge/rapier3d/rapier.js'
import { BALL_RADIUS, BALL_START, FLIPPER_LENGTH, FLIPPER_PIVOTS, FLIPPER_REST, FLIPPER_UP, FLIPPER_Y, flipperAngle, pinballBumpers, pinballLaneRails, pinballRails, pinballTargets, railGeometry, rotationZ } from '../domain/pinball'
import type { PinballInputs, PinballSnapshot } from '../domain/pinball'

const STEP = 1 / 120
/** Fixed-step XY physics. Depth is visual in this prototype; ramps come later. */
export class PinballEngine {
  readonly world = new RAPIER.World({ x: 0, y: -7.8, z: 0 })
  readonly ball: RAPIER.RigidBody
  readonly flippers: RAPIER.RigidBody[]
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
  constructor() {
    this.world.timestep = STEP
    this.world.integrationParameters.maxCcdSubsteps = 4
    for (const rail of [...pinballRails, ...pinballLaneRails]) {
      const { x, y, length, angle } = railGeometry(rail)
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(length / 2, .12, .6).setTranslation(x, y, .3).setRotation(rotationZ(angle)).setRestitution(.65).setFriction(.1))
    }
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
  releaseControls() { this.inputs.left = false; this.inputs.right = false; this.inputs.launch = false; this.wasCharging = false; this.charge = 0 }
  private parkBall() {
    this.ball.setTranslation(BALL_START, true); this.ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.ball.setGravityScale(0, true); this.ready = true; this.charge = 0; this.wasCharging = false
  }
  reset() { this.releaseControls(); this.parkBall(); this.shots = 0; this.drains = 0; this.hits = 0; this.accumulator = 0 }
  advance(seconds: number) {
    if (this.disposed || !Number.isFinite(seconds) || seconds <= 0) return
    this.accumulator += Math.min(seconds, .1)
    while (this.accumulator + 1e-9 >= STEP) { this.step(); this.accumulator -= STEP }
  }
  private step() {
    if (this.ready) {
      if (this.inputs.launch) { this.charge = Math.min(1, this.charge + STEP / 1.2); this.wasCharging = true }
      else if (this.wasCharging) {
        this.ball.setGravityScale(1, true)
        this.ball.setLinvel({ x: 0, y: 14 + 5 * this.charge, z: 0 }, true)
        this.ready = false; this.wasCharging = false; this.charge = 0; this.shots++
      }
    }
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
    if (!this.ready && (position.y < -7.3 || Math.abs(position.x) > 6 || position.y > 9 || (position.x > 3.6 && position.y < -5.7 && velocity.y < 0))) { this.drains++; this.parkBall() }
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.events.free(); this.world.free() }
}
