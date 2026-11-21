import { useEffect, useMemo } from 'react'
import { CatmullRomCurve3, Vector3 } from 'three'
import { pinballBumpers, pinballLaneEdges, pinballRails, pinballTargets, railGeometry } from '../domain/pinball'
import { createPinballArtwork } from './pinball-art'

const laneCurves = pinballLaneEdges.map((points) => new CatmullRomCurve3(points.map(([x, y]) => new Vector3(x, y, .32))))
const lampPositions = Array.from({ length: 12 }, (_, index) => {
  const angle = index * Math.PI / 6
  return { x: -.05 + Math.cos(angle) * 1.35, y: -1.2 + Math.sin(angle) * 1.35, lit: index % 3 === 0 }
})
export function PinballTable() {
  const artwork = useMemo(() => createPinballArtwork(), [])
  useEffect(() => () => artwork.dispose(), [artwork])
  return <>
    <mesh position={[0, 0, -.25]}><boxGeometry args={[9.6, 14.4, .5]} /><meshStandardMaterial color="#292a32" metalness={.35} roughness={.6} /></mesh>
    <mesh position={[0, 0, .012]}><planeGeometry args={[9.4, 14.2]} /><meshBasicMaterial map={artwork} toneMapped={false} /></mesh>
    {pinballRails.map((rail, index) => {
      const { x, y, length, angle } = railGeometry(rail)
      return <group key={index} position={[x, y, .3]} rotation={[0, 0, angle]}>
        <mesh><boxGeometry args={[length, .24, .6]} /><meshStandardMaterial color="#575758" metalness={.6} roughness={.35} /></mesh>
        <mesh position={[0, 0, .31]}><boxGeometry args={[length, .11, .06]} /><meshStandardMaterial color="#d0c9b9" metalness={.7} roughness={.25} /></mesh>
      </group>
    })}
    {laneCurves.map((curve, index) => <mesh key={index}><tubeGeometry args={[curve, 48, .105, 8, false]} /><meshStandardMaterial color={index < 2 ? '#b9a9b9' : '#a6a398'} metalness={.65} roughness={.3} /></mesh>)}
    {pinballBumpers.map(({ x, y, radius }, index) => <group key={index} position={[x, y, .3]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius * 1.12, .42, 24]} /><meshStandardMaterial color="#d7d4c9" metalness={.5} roughness={.35} /></mesh>
      <mesh position={[0, 0, .24]}><torusGeometry args={[radius * .8, .055, 8, 24]} /><meshStandardMaterial color="#7e4a79" metalness={.5} roughness={.35} /></mesh>
      <mesh position={[0, 0, .26]}><circleGeometry args={[radius * .63, 24]} /><meshStandardMaterial color="#d1ad69" emissive="#dba766" emissiveIntensity={.23} /></mesh>
      <mesh position={[0, 0, .29]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[radius * .36, radius * .36, .07]} /><meshStandardMaterial color="#efdec3" /></mesh>
    </group>)}
    {pinballTargets.map(({ x, y, angle }, index) => <group key={index} position={[x, y, .3]} rotation={[0, 0, angle]}>
      <mesh><boxGeometry args={[.26, .18, .7]} /><meshStandardMaterial color="#dfcc54" metalness={.25} roughness={.4} /></mesh>
      <mesh position={[0, -.095, .03]}><planeGeometry args={[.14, .3]} /><meshStandardMaterial color="#d35c41" side={2} /></mesh>
    </group>)}
    {lampPositions.map(({ x, y, lit }, index) => <mesh key={index} position={[x, y, .045]}>
      <circleGeometry args={[.075, 16]} /><meshBasicMaterial color={lit ? '#ebcb60' : '#263e56'} />
    </mesh>)}
    {[-1, 1].map((side) => <group key={side} position={[side * 2.42, -3.65, .06]} rotation={[0, 0, side * .22]}>
      <mesh><boxGeometry args={[.85, 1.25, .12]} /><meshStandardMaterial color="#4f364d" metalness={.25} transparent opacity={.7} /></mesh>
      <mesh position={[0, 0, .08]}><planeGeometry args={[.63, .96]} /><meshStandardMaterial color="#453f78" transparent opacity={.45} /></mesh>
    </group>)}
    <mesh position={[4, -6.05, .3]}><boxGeometry args={[.55, .22, .35]} /><meshStandardMaterial color="#b39c78" metalness={.55} /></mesh>
    <mesh position={[0, -6.95, .04]}><planeGeometry args={[5.8, .09]} /><meshBasicMaterial color="#942e39" /></mesh>
  </>
}
