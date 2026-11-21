import { describe, expect, it } from 'vitest'
import { canMoveSolitaire, createSolitaireGame, defaultSolitaireOptions, shuffledDeck, solitaireReducer, sourceCards } from './solitaire'
import type { SolitaireGame } from './solitaire'
const ordered = Array.from({ length: 52 }, (_, i) => i)
function empty(): SolitaireGame {
  return { ...createSolitaireGame(defaultSolitaireOptions, ordered), stock: [], waste: [], tableau: Array.from({ length: 7 }, () => []), foundations: [[], [], [], []] }
}
function allCards(game: SolitaireGame) { return [...game.stock, ...game.waste, ...game.foundations.flat(), ...game.tableau.flat().map((card) => card.id)] }

describe('Klondike Solitaire', () => {
  it('deals 52 different cards into seven columns and a stock of 24 without changing the deck', () => {
    const deck = shuffledDeck(() => .25)
    const copy = [...deck]
    const game = createSolitaireGame(defaultSolitaireOptions, deck)
    expect(game.tableau.map((pile) => pile.length)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(game.tableau.flat().filter((card) => card.faceUp)).toHaveLength(7)
    expect(game.tableau.every((pile) => pile.at(-1)!.faceUp)).toBe(true)
    expect(game.stock).toHaveLength(24)
    expect(allCards(game).toSorted((a, b) => a - b)).toEqual(ordered)
    expect(deck).toEqual(copy)
    expect(() => createSolitaireGame(defaultSolitaireOptions, [1, 1])).toThrow()
  })
  it('draws three or one, only exposes the last waste card and preserves order when recycling', () => {
    const game = createSolitaireGame(defaultSolitaireOptions, ordered)
    const drawn = solitaireReducer(game, { type: 'draw' })
    expect(drawn.waste).toEqual([23, 22, 21])
    expect(sourceCards(drawn, { kind: 'waste' })).toEqual([21])
    expect(game.stock).toHaveLength(24)
    let next = game
    for (let i = 0; i < 8; i++) next = solitaireReducer(next, { type: 'draw' })
    next = solitaireReducer(next, { type: 'draw' })
    expect(next.stock).toEqual(game.stock)
    expect(next.waste).toEqual([])
    const single = solitaireReducer(createSolitaireGame({ ...defaultSolitaireOptions, draw: 1 }, ordered), { type: 'draw' })
    expect(single.waste).toEqual([23])
  })
  it('moves alternating descending sequences, and only kings can fill empty columns', () => {
    const game = empty()
    game.tableau[0] = [5, 17, 3].map((id) => ({ id, faceUp: true }))
    game.tableau[1] = [{ id: 19, faceUp: true }]
    const from = { kind: 'tableau', column: 0, index: 0 } as const
    expect(canMoveSolitaire(game, from, { kind: 'tableau', column: 1 })).toBe(true)
    const moved = solitaireReducer(game, { type: 'move', from, to: { kind: 'tableau', column: 1 } })
    expect(moved.tableau[1].map((card) => card.id)).toEqual([19, 5, 17, 3])
    expect(moved.tableau[0]).toEqual([])
    expect(game.tableau[0]).toHaveLength(3)
    expect(canMoveSolitaire(game, from, { kind: 'tableau', column: 0 })).toBe(false)
    expect(canMoveSolitaire(game, from, { kind: 'tableau', column: 2 })).toBe(false)
    game.waste = [12]
    expect(canMoveSolitaire(game, { kind: 'waste' }, { kind: 'tableau', column: 2 })).toBe(true)
    game.waste = [31]
    expect(canMoveSolitaire(game, { kind: 'waste' }, { kind: 'tableau', column: 1 })).toBe(false)
  })
  it('builds foundations by suit starting with an ace and disallows moving a sequence onto them', () => {
    let game = empty()
    game.waste = [1, 0]
    game = solitaireReducer(game, { type: 'move', from: { kind: 'waste' }, to: { kind: 'foundation', column: 2 } })
    expect(game.foundations[2]).toEqual([0])
    expect(game.score).toBe(10)
    expect(canMoveSolitaire(game, { kind: 'waste' }, { kind: 'foundation', column: 2 })).toBe(true)
    game.waste = [14]
    expect(canMoveSolitaire(game, { kind: 'waste' }, { kind: 'foundation', column: 2 })).toBe(false)
    game.tableau[0] = [{ id: 1, faceUp: true }, { id: 13, faceUp: true }]
    expect(canMoveSolitaire(game, { kind: 'tableau', column: 0, index: 0 }, { kind: 'foundation', column: 2 })).toBe(false)
  })
  it('requires an explicit flip of a newly exposed card and rejects hidden cards', () => {
    let game = empty()
    game.tableau[0] = [{ id: 13, faceUp: false }, { id: 5, faceUp: true }]
    game.tableau[1] = [{ id: 19, faceUp: true }]
    expect(sourceCards(game, { kind: 'tableau', column: 0, index: 0 })).toEqual([])
    game = solitaireReducer(game, { type: 'move', from: { kind: 'tableau', column: 0, index: 1 }, to: { kind: 'tableau', column: 1 } })
    expect(game.tableau[0][0].faceUp).toBe(false)
    const flipped = solitaireReducer(game, { type: 'flip', column: 0 })
    expect(flipped.tableau[0][0].faceUp).toBe(true)
    expect(flipped.score).toBe(5)
    expect(solitaireReducer(flipped, { type: 'flip', column: 0 })).toBe(flipped)
  })
  it('undoes moves without rewinding elapsed time or refunding time penalties', () => {
    let game = empty()
    game.waste = [0]
    game.score = 40
    game = solitaireReducer(game, { type: 'move', from: { kind: 'waste' }, to: { kind: 'foundation', column: 0 } })
    game = solitaireReducer(game, { type: 'tick', seconds: 20 })
    expect(game.score).toBe(46)
    const undone = solitaireReducer(game, { type: 'undo' })
    expect(undone.waste).toEqual([0])
    expect(undone.foundations[0]).toEqual([])
    expect(undone.elapsed).toBe(20)
    expect(undone.score).toBe(34)
  })
  it('charges each undo once instead of refunding earlier undo penalties', () => {
    let game = createSolitaireGame(defaultSolitaireOptions, ordered)
    game.score = 100
    game = solitaireReducer(solitaireReducer(game, { type: 'draw' }), { type: 'draw' })
    game = solitaireReducer(game, { type: 'undo' })
    expect(game.score).toBe(98)
    expect(solitaireReducer(game, { type: 'undo' }).score).toBe(96)
  })
  it('applies stock pass penalties and never loses or duplicates cards across draws and undos', () => {
    let game = createSolitaireGame(defaultSolitaireOptions, ordered)
    game.score = 100
    for (let i = 0; i < 27; i++) game = solitaireReducer(game, { type: 'draw' })
    expect(game.passes).toBe(4)
    expect(game.score).toBe(80)
    for (let i = 0; i < 4; i++) game = solitaireReducer(game, { type: 'undo' })
    expect(allCards(game).toSorted((a, b) => a - b)).toEqual(ordered)
    const single = empty()
    single.options = { ...defaultSolitaireOptions, draw: 1 }
    single.waste = [0]; single.score = 120
    expect(solitaireReducer(single, { type: 'draw' }).score).toBe(20)
  })
  it('completes the four foundations and freezes the won game', () => {
    const game = empty()
    game.foundations = [ordered.slice(0, 13), ordered.slice(13, 26), ordered.slice(26, 39), ordered.slice(39, 51)]
    game.tableau[0] = [{ id: 51, faceUp: true }]
    game.started = true; game.elapsed = 60
    const won = solitaireReducer(game, { type: 'move', from: { kind: 'tableau', column: 0, index: 0 }, to: { kind: 'foundation', column: 3 } })
    expect(won.won).toBe(true)
    expect(allCards(won).toSorted((a, b) => a - b)).toEqual(ordered)
    expect(won.score).toBe(10 + Math.floor(700000 / 60))
    expect(solitaireReducer(won, { type: 'draw' })).toBe(won)
    expect(solitaireReducer(won, { type: 'undo' })).toBe(won)
    expect(solitaireReducer(won, { type: 'tick', seconds: 30 })).toBe(won)
  })
})
