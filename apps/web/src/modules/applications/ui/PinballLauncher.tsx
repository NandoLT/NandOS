import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Curve, Group, Mesh, Vector3 } from 'three'
import { BALL_START, PLUNGER_BASE_Y, PLUNGER_HEAD_Y, PLUNGER_STROKE } from '../domain/pinball'
import type { PinballEngine } from '../infrastructure/pinball-engine'

class SpringCurve extends Curve<Vector3> {
  constructor() { super() }
  getPoint(t: number, target = new Vector3()) {
    const angle = t * Math.PI * 18
    return target.set(Math.cos(angle) * .135, t, Math.sin(angle) * .135)
  }
}
const springCurve = new SpringCurve()
export function PinballLauncher({ engine }: { engine: PinballEngine }) {
  const spring = useRef<Mesh>(null)
  const assembly = useRef<Group>(null)
  useFrame(() => {
    const travel = engine.launcherCompression() * PLUNGER_STROKE
    if (assembly.current) assembly.current.position.y = PLUNGER_HEAD_Y - travel
    if (spring.current) spring.current.scale.y = PLUNGER_HEAD_Y - .07 - PLUNGER_BASE_Y - travel
  })
  return <group position={[BALL_START.x, 0, BALL_START.z]}>
    <mesh position={[0, PLUNGER_BASE_Y, 0]}><boxGeometry args={[.66, .13, .48]} /><meshStandardMaterial color="#888b91" metalness={.5} roughness={.3} /></mesh>
    <mesh ref={spring} position={[0, PLUNGER_BASE_Y + .02, 0]}>
      <tubeGeometry args={[springCurve, 144, .027, 6, false]} /><meshStandardMaterial color="#dce1e4" metalness={.55} roughness={.28} />
    </mesh>
    <group ref={assembly} position={[0, PLUNGER_HEAD_Y, 0]}>
      <mesh><cylinderGeometry args={[.245, .245, .1, 24]} /><meshStandardMaterial color="#c4bdad" metalness={.5} roughness={.3} /></mesh>
      <mesh position={[0, -.44, 0]}><cylinderGeometry args={[.045, .045, .88, 12]} /><meshStandardMaterial color="#b5bbc3" metalness={.6} roughness={.25} /></mesh>
      <mesh position={[0, -.94, 0]}><sphereGeometry args={[.17, 20, 12]} /><meshStandardMaterial color="#ba2542" metalness={.2} roughness={.28} /></mesh>
    </group>
  </group>
}
