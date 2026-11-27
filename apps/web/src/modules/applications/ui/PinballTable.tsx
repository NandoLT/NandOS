import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CurvePath, LineCurve3, Shape, Vector2, Vector3 } from 'three'
import type { MeshStandardMaterial } from 'three'
import type { PinballEngine } from '../infrastructure/pinball-engine'
import {
  FIELD_CENTER, LANE_RAIL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH, TARGET_FACE_CENTERS,
  TARGET_FACE_OFFSET, TARGET_FACE_WIDTH, TARGET_THICKNESS, TARGET_WIDTH,
  pathRails, pinballBumpers, pinballCabinet, pinballGuidePaths, pinballOrbitEdges,
  pinballReturnLanes, pinballSlings, pinballTargets, railGeometry,
} from '../domain/pinball'
import { createPinballArtwork } from './pinball-art'

const cabinetShape = new Shape().setFromPoints(pinballCabinet.map(([x, y]) => new Vector2(x, y)))
function tubePath(points: typeof pinballCabinet, z: number) {
  const path = new CurvePath<Vector3>()
  for (const { from, to } of pathRails(points)) path.add(new LineCurve3(new Vector3(...from, z), new Vector3(...to, z)))
  return path
}
const guideCurves = pinballGuidePaths.map((points) => tubePath(points, .29))
const orbitLights = pinballOrbitEdges.map((points) => tubePath(points, .22))
function PopBumper({ index, engine }: { index: number; engine: PinballEngine }) {
  const { x, y, radius } = pinballBumpers[index]
  const lamp = useRef<MeshStandardMaterial>(null)
  useFrame(() => { if (lamp.current) lamp.current.emissiveIntensity = .3 + engine.light('bumper', index) * 3 })
  return <group position={[x, y, .3]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius * 1.1, radius * 1.22, .24, 32]} /><meshStandardMaterial color="#454650" metalness={.65} roughness={.3} /></mesh>
    <mesh position={[0, 0, -.24]}><torusGeometry args={[radius * 1.23, .022, 8, 32]} /><meshBasicMaterial color="#b450ed" /></mesh>
    <mesh position={[0, 0, -.06]}><torusGeometry args={[radius * .95, .044, 8, 32]} /><meshBasicMaterial color="#ff7763" /></mesh>
    <mesh position={[0, 0, .16]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius * .92, radius * 1.05, .23, 32]} /><meshStandardMaterial color="#d9cec1" metalness={.26} roughness={.32} /></mesh>
    {[0, 1, 2, 3, 4, 5].map((index) => {
      const angle = index * Math.PI / 3
      return <mesh key={index} position={[Math.cos(angle) * radius * .76, Math.sin(angle) * radius * .76, .28]}>
        <sphereGeometry args={[.035, 8, 6]} /><meshStandardMaterial color="#635866" metalness={.4} />
      </mesh>
    })}
    <mesh position={[0, 0, .28]}><torusGeometry args={[radius * .51, .055, 8, 32]} /><meshStandardMaterial color="#a63370" metalness={.35} /></mesh>
    <mesh position={[0, 0, .3]}><circleGeometry args={[radius * .45, 32]} /><meshStandardMaterial ref={lamp} color="#ffdc83" emissive="#ff9976" toneMapped={false} /></mesh>
  </group>
}
function TargetBank({ index, engine }: { index: 0 | 1; engine: PinballEngine }) {
  const { x, y, angle } = pinballTargets[index]
  const lamps = useRef<(MeshStandardMaterial | null)[]>([])
  useFrame(() => {
    const lit = engine.snapshot().game.targets[index]
    for (const lamp of lamps.current) if (lamp) lamp.emissiveIntensity = (lit ? .75 : .25) + engine.light('target', index) * 2.5
  })
  return <group position={[x, y, .3]} rotation={[0, 0, angle]}>
    <mesh position={[0, 0, -.22]}><boxGeometry args={[TARGET_WIDTH + .1, TARGET_THICKNESS + .12, .09]} /><meshBasicMaterial color="#b364db" /></mesh>
    <mesh><boxGeometry args={[TARGET_WIDTH, TARGET_THICKNESS, .55]} /><meshStandardMaterial color="#615667" metalness={.48} roughness={.4} /></mesh>
    {TARGET_FACE_CENTERS.map((offset, lampIndex) => <mesh key={offset} position={[offset, TARGET_FACE_OFFSET, .13]} rotation={[-.5, 0, 0]}>
      <boxGeometry args={[TARGET_FACE_WIDTH, .17, .35]} />
      <meshStandardMaterial ref={(lamp) => { lamps.current[lampIndex] = lamp }} color="#e6b650" emissive="#ffa43e" roughness={.42} />
    </mesh>)}
  </group>
}
function Slingshot({ index, engine }: { index: number; engine: PinballEngine }) {
  const sling = pinballSlings[index]
  const shape = useMemo(() => new Shape().setFromPoints(sling.points.map(([x, y]) => new Vector2(x, y))), [sling])
  const lamp = useRef<MeshStandardMaterial>(null)
  useFrame(() => { if (lamp.current) lamp.current.emissiveIntensity = engine.light('sling', index) * 1.4 })
  return <group>
    <mesh position={[0, 0, .14]}><extrudeGeometry args={[shape, { depth: .18, bevelEnabled: true, bevelSize: .04, bevelThickness: .03, bevelSegments: 1 }]} />
      <meshStandardMaterial ref={lamp} color="#763eab" emissive="#ae4ee8" emissiveIntensity={.25} metalness={.2} roughness={.42} />
    </mesh>
    {sling.points.map((from, edge) => {
      const { x, y, length, angle } = railGeometry({ from, to: sling.points[(edge + 1) % 3] })
      return <group key={edge} position={[x, y, .37]} rotation={[0, 0, angle]}>
        <mesh><boxGeometry args={[length, .095, .09]} /><meshStandardMaterial color="#a82b51" roughness={.6} /></mesh>
        <mesh position={[0, 0, .06]}><boxGeometry args={[length, .035, .03]} /><meshBasicMaterial color="#ffd499" /></mesh>
      </group>
    })}
    {sling.points.map(([x, y], point) => <mesh key={point} position={[x, y, .38]}><sphereGeometry args={[.09, 12, 8]} /><meshStandardMaterial color="#d5c9ae" metalness={.6} /></mesh>)}
  </group>
}
export function PinballTable({ engine }: { engine: PinballEngine }) {
  const artwork = useMemo(() => createPinballArtwork(), [])
  useEffect(() => () => artwork.dispose(), [artwork])
  return <>
    <mesh position={[0, 0, -.35]}><extrudeGeometry args={[cabinetShape, { depth: .34, bevelEnabled: false }]} /><meshStandardMaterial color="#292631" metalness={.35} roughness={.6} /></mesh>
    <mesh position={[0, 0, .012]}><planeGeometry args={[TABLE_WIDTH, TABLE_HEIGHT]} /><meshBasicMaterial map={artwork} toneMapped={false} transparent /></mesh>
    {pathRails(pinballCabinet).map((rail, index) => {
      const { x, y, length, angle } = railGeometry(rail)
      return <group key={index} position={[x, y, .3]} rotation={[0, 0, angle]}>
        <mesh><boxGeometry args={[length + .12, .24, .6]} /><meshStandardMaterial color="#514858" metalness={.5} roughness={.35} /></mesh>
        <mesh position={[0, 0, .31]}><boxGeometry args={[length + .1, .15, .06]} /><meshStandardMaterial color="#dbcede" metalness={.42} roughness={.25} /></mesh>
      </group>
    })}
    {guideCurves.map((curve, index) => <mesh key={index}>
      <tubeGeometry args={[curve, index < 2 ? 192 : 56, LANE_RAIL_RADIUS, 8, false]} />
      <meshStandardMaterial color={index === 0 ? '#cba7ec' : '#efd4a0'} metalness={.4} roughness={.26} />
    </mesh>)}
    {orbitLights.map((curve, index) => <mesh key={index}>
      <tubeGeometry args={[curve, 192, .03, 6, false]} /><meshBasicMaterial color={index === 0 ? '#a955e7' : '#ffc071'} />
    </mesh>)}
    {pinballReturnLanes.map(({ divider }, index) => <mesh key={index} position={[...divider[0], .29]}>
      <sphereGeometry args={[.1, 12, 8]} /><meshStandardMaterial color="#c4af9b" metalness={.3} />
    </mesh>)}
    {pinballBumpers.map((_, index) => <PopBumper key={index} index={index} engine={engine} />)}
    <TargetBank index={0} engine={engine} /><TargetBank index={1} engine={engine} />
    {pinballSlings.map((_, index) => <Slingshot key={index} index={index} engine={engine} />)}
    <group position={[FIELD_CENTER, -7.04, .16]}>
      <mesh><boxGeometry args={[8.25, .18, .36]} /><meshStandardMaterial color="#44394f" metalness={.32} /></mesh>
      <mesh position={[0, 0, .18]}><boxGeometry args={[8.2, .05, .05]} /><meshStandardMaterial color="#c1b3cd" metalness={.4} /></mesh>
      {[-2.57, 2.57].map((x) => <mesh key={x} position={[x, -.1, .02]}>
        <boxGeometry args={[2, .025, .044]} /><meshBasicMaterial color="#d453b7" />
      </mesh>)}
    </group>
  </>
}
