import { describe, expect, it } from 'vitest'
import { createPinballGame, pinballGameEvent as event, pinballMessage } from './pinball-game'

const playing = () => event(createPinballGame(), { type: 'launch' })

describe('Pinball classic rules', () => {
  it('ignores hits before launch and preserves the input snapshot', () => {
    const initial = createPinballGame()
    expect(event(initial, { type: 'bumper' })).toBe(initial)
    const result = event(event(initial, { type: 'launch' }), { type: 'target', bank: 0 })
    expect(result).toMatchObject({ score: 500, targets: [true, false] })
    expect(initial.targets).toEqual([false, false])
  })

  it('requires both banks and gives each objective bonus once', () => {
    let game = event(playing(), { type: 'target', bank: 1 })
    game = event(game, { type: 'target', bank: 1 })
    expect(game).toMatchObject({ targets: [false, true], score: 1000 })
    game = event(game, { type: 'target', bank: 0 })
    expect(game).toMatchObject({ targets: [true, true], score: 6500 })
    game = event(event(game, { type: 'orbit' }), { type: 'orbit' })
    expect(game).toMatchObject({ orbit: true, score: 15500 })
    expect(pinballMessage(game)).toBe('Objetivos cumplidos')
  })

  it('ends after three losses and ignores input until a fresh game', () => {
    let game = createPinballGame()
    for (let ball = 1; ball <= 3; ball++) {
      expect(game.ball).toBe(ball)
      game = event(event(game, { type: 'launch' }), { type: 'drain' })
    }
    expect(game).toMatchObject({ ball: 3, phase: 'over' })
    expect(event(game, { type: 'launch' })).toBe(game)
    expect(pinballMessage(game)).toContain('Fin de partida')
  })

  it('keeps practice unlimited and preserves objectives between balls', () => {
    let game = createPinballGame('practice')
    for (let ball = 0; ball < 5; ball++) game = event(event(game, { type: 'launch' }), { type: 'drain' })
    game = event(event(game, { type: 'launch' }), { type: 'orbit' })
    expect(event(game, { type: 'drain' })).toMatchObject({ orbit: true, score: 7000, ball: 7, phase: 'ready' })
  })

  it('returns a stuck or weak shot without consuming a ball, score or objective', () => {
    const game = event(playing(), { type: 'target', bank: 0 })
    const recovered = event(game, { type: 'recover' })
    expect(recovered).toEqual({ ...game, phase: 'ready' })
    expect(event(recovered, { type: 'launch' })).toEqual(game)
  })
})
