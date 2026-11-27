export type PinballMode = 'classic' | 'practice'
export type PinballGame = {
  mode: PinballMode
  score: number
  ball: number
  phase: 'ready' | 'playing' | 'over'
  targets: [left: boolean, right: boolean]
  orbit: boolean
}
export type PinballEvent =
  | { type: 'launch' | 'drain' | 'recover' | 'orbit' | 'bumper' | 'sling' }
  | { type: 'target'; bank: 0 | 1 }

export const createPinballGame = (mode: PinballMode = 'classic'): PinballGame => ({
  mode, score: 0, ball: 1, phase: 'ready', targets: [false, false], orbit: false,
})

export function pinballGameEvent(game: PinballGame, event: PinballEvent): PinballGame {
  if (event.type === 'launch') return game.phase === 'ready' ? { ...game, phase: 'playing' } : game
  if (game.phase !== 'playing') return game
  switch (event.type) {
    case 'recover':
      return { ...game, phase: 'ready' }
    case 'drain':
      return game.mode === 'classic' && game.ball === 3
        ? { ...game, phase: 'over' }
        : { ...game, ball: game.ball + 1, phase: 'ready' }
    case 'target': {
      const targets: PinballGame['targets'] = [...game.targets]
      targets[event.bank] = true
      const bankBonus = targets.every(Boolean) && !game.targets.every(Boolean) ? 5000 : 0
      return { ...game, targets, score: game.score + 500 + bankBonus }
    }
    case 'orbit':
      return { ...game, orbit: true, score: game.score + (game.orbit ? 2000 : 7000) }
    case 'bumper':
      return { ...game, score: game.score + 1000 }
    case 'sling':
      return { ...game, score: game.score + 100 }
  }
}

export function pinballMessage(game: PinballGame) {
  if (game.phase === 'over') return 'Fin de partida · F2 para jugar'
  if (game.phase === 'ready') return 'Carga y suelta el lanzador'
  if (!game.orbit) return 'Recorre la órbita superior'
  if (!game.targets.every(Boolean)) return 'Golpea ambos bancos de dianas'
  return 'Objetivos cumplidos'
}
