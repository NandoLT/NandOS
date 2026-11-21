import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, Mesh, PerspectiveCamera } from 'three'
import { BALL_RADIUS, FLIPPER_LENGTH, FLIPPER_PIVOTS, FLIPPER_Y, SHOOTER_GATE } from '../domain/pinball'
import type { PinballControl, PinballInputs, PinballSnapshot } from '../domain/pinball'
import { PinballTable } from './PinballTable'
import { PinballLauncher } from './PinballLauncher'
import type { PinballEngine } from '../infrastructure/pinball-engine'

function CameraRig() {
  const { size, set, get } = useThree()
  useEffect(() => {
    const previous = get().camera
    const aspect = size.width / size.height
    const camera = new PerspectiveCamera(34, aspect, .1, 120)
    const tangent = Math.tan(34 * Math.PI / 360)
    const distance = Math.max(16 / (2 * tangent), 10.8 / (2 * tangent * aspect))
    camera.position.set(0, -distance * .36, distance * .933)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    set({ camera })
    return () => { set({ camera: previous }) }
  }, [size.width, size.height, set, get])
  return null
}
function Machine({ engine, inputs, onSnapshot, onControl, onCancel }: { engine: PinballEngine; inputs: RefObject<PinballInputs>; onSnapshot: (snapshot: PinballSnapshot) => void; onControl: ControlHandler; onCancel: () => void }) {
  const ball = useRef<Mesh>(null)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const lastReport = useRef(0)
  const gate = useRef<Group>(null)
  useFrame((_, delta) => {
    Object.assign(engine.inputs, inputs.current)
    engine.advance(delta)
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
    <PinballTable />
    <PinballLauncher engine={engine} />
    {([
      { name: 'left', x: -1.2, y: FLIPPER_Y, width: 2.2, height: 1.7 },
      { name: 'right', x: 1.2, y: FLIPPER_Y, width: 2.2, height: 1.7 },
      { name: 'launch', x: 4, y: -6.2, width: 1.1, height: 2.6 },
    ] as const).map(({ name, x, y, width, height }) => <mesh key={name} position={[x, y, .9]}
      onPointerDown={(event) => { event.stopPropagation(); event.nativeEvent.preventDefault(); (event.target as Element).setPointerCapture(event.pointerId); onControl(name, 'pointer-' + event.pointerId, true) }}
      onPointerUp={(event) => { event.stopPropagation(); onControl(name, 'pointer-' + event.pointerId, false); (event.target as Element).releasePointerCapture(event.pointerId) }}
      onPointerCancel={onCancel}
      onLostPointerCapture={(event) => onControl(name, 'pointer-' + event.pointerId, false)}>
      <planeGeometry args={[width, height]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>)}
    <group position={[SHOOTER_GATE.x, SHOOTER_GATE.y, .3]}>
      <group ref={gate}><mesh position={[SHOOTER_GATE.length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[.035, .035, SHOOTER_GATE.length, 12]} /><meshStandardMaterial color="#ebdba1" metalness={.6} roughness={.25} />
      </mesh></group>
      <mesh position={[0, 0, .08]}><sphereGeometry args={[.1, 16, 12]} /><meshStandardMaterial color="#9b3648" /></mesh>
    </group>
    {FLIPPER_PIVOTS.map((x, side) => <group key={x} position={[x, FLIPPER_Y, .3]}>
      <group ref={side === 0 ? left : right}><mesh position={[FLIPPER_LENGTH / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[.14, FLIPPER_LENGTH - .28, 4, 12]} />
        <meshStandardMaterial color="#e5d7c4" metalness={.25} roughness={.35} />
      </mesh></group>
      <mesh position={[0, 0, .36]}><sphereGeometry args={[.2, 16, 12]} /><meshStandardMaterial color="#ece4cf" metalness={.5} roughness={.25} /></mesh>
    </group>)}
    <mesh ref={ball}><sphereGeometry args={[BALL_RADIUS, 24, 16]} /><meshStandardMaterial color="#f3f8ff" metalness={.7} roughness={.14} /></mesh>
  </>
}
type ControlHandler = (name: PinballControl, source: string, down: boolean) => void
export function PinballScene({ paused, releaseKey, inputs, onControl, onCancel, onSnapshot, onReady, onError }: {
  paused: boolean; releaseKey: number; inputs: RefObject<PinballInputs>; onControl: ControlHandler; onCancel: () => void; onSnapshot: (snapshot: PinballSnapshot) => void; onReady: () => void; onError: () => void
}) {
  const [engine, setEngine] = useState<PinballEngine | null>(null)
  useEffect(() => {
    let cancelled = false
    let instance: PinballEngine | undefined
    void import('../infrastructure/pinball-engine').then(({ PinballEngine }) => {
      if (cancelled) return
      instance = new PinballEngine(); setEngine(instance); onReady()
    }).catch(() => { if (!cancelled) onError() })
    return () => { cancelled = true; instance?.dispose() }
  }, [onReady, onError])
  useEffect(() => { engine?.releaseControls() }, [paused, engine, releaseKey])
  return <Canvas camera={{ position: [0, -10, 27], near: .1, far: 120 }} dpr={[1, 1.5]}
    frameloop={paused ? 'never' : 'always'} gl={{ antialias: true, alpha: false }}>
    <color attach="background" args={['#080e1c']} />
    <CameraRig />
    <ambientLight intensity={1.7} />
    <directionalLight position={[-3, 5, 10]} intensity={3} />
    <pointLight position={[4, -4, 7]} intensity={45} color="#76baff" />
    {engine && <Machine engine={engine} inputs={inputs} onSnapshot={onSnapshot} onControl={onControl} onCancel={onCancel} />}
  </Canvas>
}
