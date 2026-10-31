import { useEffect, useMemo, useRef, useState } from 'react'
import type { MascotController, MascotExpression } from '../application/mascot-controller'

interface Props {
  paused: boolean
  onReady(controller: MascotController | null): void
  onStateChange(name: string): void
}

const labels: Record<MascotExpression, string> = {
  idle: 'Reposo', listening: 'Escucha', thinking: 'Pensando', answer: 'Respuesta',
}
const ease = 'cubic-bezier(.42, 0, .58, 1)'
const neutral = 'translate(0px, 0px) scaleY(1)'
const eyeFrames: Record<MascotExpression, Keyframe[]> = {
  idle: [
    { offset: 0, transform: neutral, easing: ease },
    { offset: 0.025, transform: 'scaleY(.077)', easing: ease },
    { offset: 0.05, transform: neutral },
    { offset: 1, transform: neutral },
  ],
  listening: [
    { offset: 0, transform: 'translateY(-3px) scaleY(1.157)', easing: ease },
    { offset: 0.5, transform: 'translateY(-3px) scaleY(1.08)', easing: ease },
    { offset: 1, transform: 'translateY(-3px) scaleY(1.157)' },
  ],
  thinking: [
    { offset: 0, transform: 'translate(3px, -6px)', easing: ease },
    { offset: 0.5, transform: 'translate(-3px, -6px)', easing: ease },
    { offset: 1, transform: 'translate(3px, -6px)' },
  ],
  answer: [
    { offset: 0, transform: neutral, easing: ease },
    { offset: 0.2, transform: 'scaleY(.403)' },
    { offset: 0.5, transform: 'scaleY(.403)', easing: ease },
    { offset: 0.8, transform: neutral },
    { offset: 1, transform: neutral },
  ],
}
const nodFrames: Keyframe[] = [
  { offset: 0, transform: 'translateY(0px)', easing: ease },
  { offset: 0.2, transform: 'translateY(4px)', easing: ease },
  { offset: 0.4, transform: 'translateY(0px)' },
  { offset: 1, transform: 'translateY(0px)' },
]
const topKeys = Array.from({ length: 8 }, (_, index) => 132 + index * 36)
const bottomKeys = [{ x: 132, width: 28 }, { x: 168, width: 28 }, { x: 204, width: 136 }, { x: 348, width: 28 }, { x: 384, width: 28 }]

function animate(element: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions, paused: boolean) {
  // Older browsers keep the accessible static SVG rather than blocking the desktop.
  if (!element?.animate) return null
  try {
    const animation = element.animate(frames, { fill: 'both', ...options })
    if (paused) animation.pause()
    return animation
  } catch {
    return null
  }
}

export function SvgMascot({ paused, onReady, onStateChange }: Props) {
  const [expression, setExpression] = useState<MascotExpression>('idle')
  const [answerSequence, setAnswerSequence] = useState(0)
  const [hidden, setHidden] = useState(() => document.hidden)
  const breathing = useRef<HTMLDivElement>(null)
  const head = useRef<SVGGElement>(null)
  const eyes = useRef<SVGGElement>(null)
  const breathAnimation = useRef<Animation | null>(null)
  const faceAnimations = useRef<Animation[]>([])
  const inactive = paused || hidden
  const inactiveRef = useRef(inactive)
  const controller = useMemo<MascotController>(() => ({
    select: setExpression,
    answer() {
      setExpression('answer')
      setAnswerSequence((value) => value + 1)
    },
  }), [])

  useEffect(() => {
    onReady(controller)
    return () => onReady(null)
  }, [controller, onReady])

  useEffect(() => {
    const update = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    inactiveRef.current = inactive
    const animations = [breathAnimation.current, ...faceAnimations.current]
    for (const animation of animations) {
      if (!animation || animation.playState === 'finished' || animation.playState === 'idle') continue
      if (inactive) animation.pause()
      else animation.play()
    }
  }, [inactive])

  useEffect(() => {
    breathAnimation.current = animate(breathing.current, [
      { transform: 'translateY(0%)', easing: ease },
      { transform: 'translateY(-0.5859375%)', easing: ease },
      { transform: 'translateY(0%)' },
    ], { duration: 3000, iterations: Infinity }, inactiveRef.current)
    return () => { breathAnimation.current?.cancel(); breathAnimation.current = null }
  }, [])

  useEffect(() => {
    const animations: Animation[] = []
    if (expression === 'answer') {
      const nod = animate(head.current, nodFrames, { duration: 1000 }, inactiveRef.current)
      if (nod) animations.push(nod)
    }
    const eyeAnimation = animate(eyes.current, eyeFrames[expression], {
      duration: expression === 'idle' ? 4000 : 1000,
      iterations: expression === 'answer' ? 1 : Infinity,
    }, inactiveRef.current)
    if (eyeAnimation) {
      animations.push(eyeAnimation)
      if (expression === 'answer') eyeAnimation.onfinish = () => setExpression('idle')
    }
    faceAnimations.current = animations
    return () => {
      for (const animation of animations) { animation.onfinish = null; animation.cancel() }
      faceAnimations.current = []
    }
  }, [expression, answerSequence])

  useEffect(() => {
    // Static fallback when Web Animations is unavailable; never leave an answer stuck.
    if (expression !== 'answer' || inactive || faceAnimations.current.length) return
    const timeout = window.setTimeout(() => setExpression('idle'), 1000)
    return () => window.clearTimeout(timeout)
  }, [expression, answerSequence, inactive])

  useEffect(() => { onStateChange(labels[expression]) }, [expression, onStateChange])

  return (
    <div ref={breathing} data-motion="breathing" style={{ width: '100%', height: '100%' }}>
      <svg viewBox="0 0 512 512" width="100%" height="100%" role="img"
        aria-label="Mascota retro de NandOS" data-state={expression} data-paused={paused}>
        <title>Asistente de NandOS: {labels[expression]}</title>
        <g ref={head} data-motion="nod">
          <rect x="119" y="121" width="300" height="240" fill="#d9ceb3" />
          <rect x="139" y="139" width="260" height="190" rx="15" fill="#3a3b35" />
          <rect x="151" y="151" width="236" height="166" rx="11" fill="#152321" />
          <g ref={eyes} data-motion="eyes" fill="#9affa6" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <rect x="221" y="211" width="22" height="38" rx="11" />
            <rect x="295" y="211" width="22" height="38" rx="11" />
          </g>
        </g>
        <rect x="99" y="353" width="340" height="78" rx="8" fill="#cbbe9e" />
        <rect x="119" y="367" width="300" height="48" rx="7" fill="#3a3b35" />
        <g fill="#747474">
          {topKeys.map((x) => <rect key={x} x={x} y="374" width="28" height="14" />)}
          {bottomKeys.map(({ x, width }) => <rect key={x} x={x} y="396" width={width} height="12" />)}
        </g>
      </svg>
    </div>
  )
}
