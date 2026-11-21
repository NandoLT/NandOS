import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, Mesh, OrthographicCamera } from 'three'
import { BALL_RADIUS, FLIPPER_LENGTH, FLIPPER_PIVOTS, FLIPPER_Y, pinballBumpers, pinballRails, railGeometry } from '../domain/pinball'
import type { PinballInputs, PinballSnapshot } from '../domain/pinball'
import type { PinballEngine } from '../infrastructure/pinball-engine'

function CameraRig() {
  const { size, set, get } = useThree()
  useEffect(() => {
    const previous = get().camera
    const camera = new OrthographicCamera(-size.width / 2, size.width / 2, size.height / 2, -size.height / 2, .1, 100)
    camera.position.set(0, -8, 22)
    camera.zoom = Math.min(size.width / 10.8, size.height / 16.3)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    set({ camera })
    return () => { set({ camera: previous }) }
  }, [size.width, size.height, set, get])
  return null
}
function Machine({ engine, inputs, onSnapshot }: { engine: PinballEngine; inputs: RefObject<PinballInputs>; onSnapshot: (snapshot: PinballSnapshot) => void }) {
  const ball = useRef<Mesh>(null)
  const left = useRef<Group>(null)
  const right = useRef<Group>(null)
  const lastReport = useRef(0)
  useFrame((_, delta) => {
    Object.assign(engine.inputs, inputs.current)
    engine.advance(delta)
    const position = engine.ball.translation()
    ball.current?.position.set(position.x, position.y, position.z)
    for (const [index, ref] of [left, right].entries()) {
      const rotation = engine.flippers[index].rotation()
      ref.current?.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }
    lastReport.current += delta
    if (lastReport.current > .1) { lastReport.current = 0; onSnapshot(engine.snapshot()) }
  })
  return <>
    <mesh position={[0, 0, -.25]}><boxGeometry args={[9.6, 14.4, .5]} /><meshStandardMaterial color="#192340" roughness={.65} /></mesh>
    <mesh position={[0, 0, .01]}><planeGeometry args={[8.9, 13.5]} /><meshStandardMaterial color="#123859" roughness={.8} /></mesh>
    {[-3.5, -2.5, -1.5, -.5, .5, 1.5, 2.5].map((x) => <mesh key={x} position={[x, .5, .025]}><planeGeometry args={[.015, 11.5]} /><meshBasicMaterial color="#1b4966" /></mesh>)}
    {pinballRails.map((rail, index) => {
      const { x, y, length, angle } = railGeometry(rail)
      return <mesh key={index} position={[x, y, .3]} rotation={[0, 0, angle]}><boxGeometry args={[length, .24, .6]} /><meshStandardMaterial color="#a5c1d1" metalness={.65} roughness={.3} /></mesh>
    })}
    {pinballBumpers.map(({ x, y }, index) => <group key={index} position={[x, y, .3]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.64, .64, .55, 28]} /><meshStandardMaterial color="#e86734" metalness={.3} roughness={.35} /></mesh>
      <mesh position={[0, 0, .3]}><torusGeometry args={[.46, .07, 8, 32]} /><meshStandardMaterial color="#ffcc60" emissive="#db7817" emissiveIntensity={.6} /></mesh>
      <mesh position={[0, 0, .31]}><circleGeometry args={[.3, 24]} /><meshBasicMaterial color="#fff2c2" /></mesh>
    </group>)}
    {FLIPPER_PIVOTS.map((x, side) => <group key={x} position={[x, FLIPPER_Y, .3]}>
      <group ref={side === 0 ? left : right}><mesh position={[FLIPPER_LENGTH / 2, 0, 0]}>
        <boxGeometry args={[FLIPPER_LENGTH, .28, .6]} />
        <meshStandardMaterial color="#ffcf57" metalness={.25} roughness={.35} />
      </mesh></group>
      <mesh position={[0, 0, .36]}><sphereGeometry args={[.2, 16, 12]} /><meshStandardMaterial color="#ece4cf" metalness={.5} roughness={.25} /></mesh>
    </group>)}
    <mesh ref={ball}><sphereGeometry args={[BALL_RADIUS, 24, 16]} /><meshStandardMaterial color="#f3f8ff" metalness={.7} roughness={.14} /></mesh>
    <mesh position={[4, -6.05, .3]}><boxGeometry args={[.55, .22, .35]} /><meshStandardMaterial color="#e44935" /></mesh>
    <mesh position={[0, -6.9, .03]}><planeGeometry args={[5.8, .12]} /><meshBasicMaterial color="#e04741" /></mesh>
  </>
}
export function PinballScene({ paused, releaseKey, inputs, onSnapshot, onReady, onError }: {
  paused: boolean; releaseKey: number; inputs: RefObject<PinballInputs>; onSnapshot: (snapshot: PinballSnapshot) => void; onReady: () => void; onError: () => void
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
  return <Canvas orthographic camera={{ position: [0, -8, 22], near: .1, far: 100 }} dpr={[1, 1.5]}
    frameloop={paused ? 'never' : 'always'} gl={{ antialias: true, alpha: false }}>
    <color attach="background" args={['#080e1c']} />
    <CameraRig />
    <ambientLight intensity={1.7} />
    <directionalLight position={[-3, 5, 10]} intensity={3} />
    <pointLight position={[4, -4, 7]} intensity={45} color="#76baff" />
    {engine && <Machine engine={engine} inputs={inputs} onSnapshot={onSnapshot} />}
  </Canvas>
}
