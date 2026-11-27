import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, Mesh, PerspectiveCamera } from 'three'
import { BALL_RADIUS, BALL_START, FLIPPER_LENGTH, FLIPPER_PIVOTS, FLIPPER_RADIUS, FLIPPER_Y, SHOOTER_GATE, TABLE_WIDTH } from '../domain/pinball'
import type { PinballControl, PinballInputs, PinballSnapshot } from '../domain/pinball'
import { PinballTable } from './PinballTable'
import { PinballLauncher } from './PinballLauncher'
import type { PinballEngine } from '../infrastructure/pinball-engine'

function CameraRig() {
  const { size, set, get } = useThree()
  useEffect(() => {
    const previous = get().camera
    const aspect = size.width / size.height
    const camera = new PerspectiveCamera(42, aspect, .1, 120)
    const tangent = Math.tan(42 * Math.PI / 360)
    // Flatten the view in a narrow cabinet so the table uses the portrait height.
    const tilt = .14 + .35 * Math.max(0, Math.min(1, (aspect - .69) / .19))
    const rise = Math.sqrt(1 - tilt * tilt)
    const target = -.2 - 1.32 * tilt
    let distance = 0
    // Fit the cabinet, not a padded bounding sphere; retain the original's foreshortening.
    for (const x of [-TABLE_WIDTH / 2, TABLE_WIDTH / 2]) for (const y of [-7.4, 7.1]) for (const z of [-.38, .62]) {
      const relativeY = y - target
      distance = Math.max(distance, Math.abs(x) / (tangent * aspect * .99) - tilt * relativeY + rise * z,
        Math.abs(rise * relativeY + tilt * z) / (tangent * .99) - tilt * relativeY + rise * z)
    }
    camera.position.set(0, target - distance * tilt, distance * rise)
    camera.lookAt(0, target, 0)
    camera.updateProjectionMatrix()
    set({ camera })
    return () => { set({ camera: previous }) }
  }, [size.width, size.height, set, get])
  return null
}
function Machine({ engine, inputs, onSnapshot, onControl, releaseKey, paused }: { engine: PinballEngine; inputs: RefObject<PinballInputs>; onSnapshot: (snapshot: PinballSnapshot) => void; onControl: ControlHandler; releaseKey: number; paused: boolean }) {
  const skipStep = useRef(true)
  useEffect(() => { skipStep.current = true }, [paused, releaseKey])
  const ball = useRef<Mesh>(null)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const lastReport = useRef(0)
  const gate = useRef<Group>(null)
  useFrame((_, delta) => {
    Object.assign(engine.inputs, inputs.current)
    if (skipStep.current) skipStep.current = false
    else engine.advance(delta)
    const position = engine.ball.translation()
    ball.current?.position.set(position.x, position.y, position.z)
    for (const [index, ref] of [left, right].entries()) {
      const rotation = engine.flippers[index].rotation()
      ref.current?.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }
    const gateRotation = engine.gate.rotation()
    gate.current?.quaternion.set(gateRotation.x, gateRotation.y, gateRotation.z, gateRotation.w)
    lastReport.current += delta
    if (lastReport.current > .1) { lastReport.current = 0; onSnapshot(engine.snapshot()) }
  })
  return <>
    <PinballTable engine={engine} />
    <PinballLauncher engine={engine} />
    {([
      { name: 'left', x: FLIPPER_PIVOTS[0] + .66, y: FLIPPER_Y - .15, width: 2.35, height: 2.15 },
      { name: 'right', x: FLIPPER_PIVOTS[1] - .66, y: FLIPPER_Y - .15, width: 2.35, height: 2.15 },
      { name: 'launch', x: BALL_START.x, y: -6.25, width: 1.1, height: 2.5 },
    ] as const).map(({ name, x, y, width, height }) => <mesh key={name} position={[x, y, .9]}
      onPointerDown={(event) => { event.stopPropagation(); (event.target as Element).setPointerCapture(event.pointerId); onControl(name, 'pointer-' + event.pointerId, true) }}
      onPointerUp={(event) => { event.stopPropagation(); onControl(name, 'pointer-' + event.pointerId, false); (event.target as Element).releasePointerCapture(event.pointerId) }}>
      <planeGeometry args={[width, height]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>)}
    <group position={[SHOOTER_GATE.x, SHOOTER_GATE.y, .3]}>
      <group ref={gate}><mesh position={[SHOOTER_GATE.length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[.035, .035, SHOOTER_GATE.length, 12]} /><meshStandardMaterial color="#ebdba1" metalness={.6} roughness={.25} />
      </mesh></group>
      <mesh position={[0, 0, .08]}><sphereGeometry args={[.1, 16, 12]} /><meshStandardMaterial color="#9b3648" /></mesh>
    </group>
    {FLIPPER_PIVOTS.map((x, side) => <group key={x} position={[x, FLIPPER_Y, .3]}>
      <group ref={side === 0 ? left : right}>
        <mesh position={[FLIPPER_LENGTH / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[FLIPPER_RADIUS, FLIPPER_LENGTH - 2 * FLIPPER_RADIUS, 4, 16]} /><meshStandardMaterial color="#b5353f" roughness={.65} />
        </mesh>
        <mesh position={[FLIPPER_LENGTH / 2, 0, .1]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[.115, FLIPPER_LENGTH - 2 * FLIPPER_RADIUS, 4, 16]} /><meshStandardMaterial color="#eee4c9" metalness={.15} roughness={.4} />
        </mesh>
      </group>
      <mesh position={[0, 0, .36]}><sphereGeometry args={[.2, 16, 12]} /><meshStandardMaterial color="#ece4cf" metalness={.5} roughness={.25} /></mesh>
    </group>)}
    <mesh ref={ball}><sphereGeometry args={[BALL_RADIUS, 24, 16]} /><meshStandardMaterial color="#f3f8ff" metalness={.7} roughness={.14} /></mesh>
  </>
}
type ControlHandler = (name: PinballControl, source: string, down: boolean) => void
export function PinballScene({ mode, paused, releaseKey, inputs, onControl, onSnapshot, onReady, onError }: {
  mode: import('../domain/pinball-game').PinballMode; paused: boolean; releaseKey: number; inputs: RefObject<PinballInputs>; onControl: ControlHandler; onSnapshot: (snapshot: PinballSnapshot) => void; onReady: () => void; onError: () => void
}) {
  const [engine, setEngine] = useState<PinballEngine | null>(null)
  useEffect(() => {
    let cancelled = false
    let instance: PinballEngine | undefined
    void import('../infrastructure/pinball-engine').then(({ PinballEngine }) => {
      if (cancelled) return
      instance = new PinballEngine(mode); setEngine(instance); onReady()
    }).catch(() => { if (!cancelled) onError() })
    return () => { cancelled = true; instance?.dispose() }
  }, [onReady, onError, mode])
  useEffect(() => { engine?.releaseControls() }, [paused, engine, releaseKey])
  return <Canvas camera={{ position: [0, -10, 27], near: .1, far: 120 }} dpr={[1, 1.5]}
    frameloop={paused ? 'never' : 'always'} gl={{ antialias: true, alpha: false }}>
    <color attach="background" args={['#080e1c']} />
    <CameraRig />
    <ambientLight intensity={1.7} />
    <directionalLight position={[-3, 5, 10]} intensity={3} />
    <pointLight position={[4, -4, 7]} intensity={45} color="#76baff" />
    {engine && <Machine engine={engine} inputs={inputs} onSnapshot={onSnapshot} onControl={onControl} releaseKey={releaseKey} paused={paused} />}
  </Canvas>
}
