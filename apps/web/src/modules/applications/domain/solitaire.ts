export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
export const suitNames = { clubs: 'tréboles', diamonds: 'diamantes', hearts: 'corazones', spades: 'picas' }
export const suitSymbols = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' }
export const cardSuit = (id: number): Suit => suits[Math.floor(id / 13)]
export const cardRank = (id: number) => id % 13 + 1
export const isRedCard = (id: number) => cardSuit(id) === 'diamonds' || cardSuit(id) === 'hearts'
export const rankLabel = (id: number) => ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][cardRank(id)]
export const cardName = (id: number) => ['', 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jota', 'Reina', 'Rey'][cardRank(id)]
export const describeCard = (id: number) => cardName(id) + ' de ' + suitNames[cardSuit(id)]
export type TableauCard = { id: number; faceUp: boolean }
export type SolitaireSource = { kind: 'waste' } | { kind: 'foundation'; column: number } | { kind: 'tableau'; column: number; index: number }
export type SolitaireTarget = { kind: 'foundation' | 'tableau'; column: number }
export type SolitaireOptions = { draw: 1 | 3; scoring: boolean; timed: boolean }
export const defaultSolitaireOptions: SolitaireOptions = { draw: 3, scoring: true, timed: true }
type Board = { stock: number[]; waste: number[]; tableau: TableauCard[][]; foundations: number[][]; score: number; passes: number; moves: number; penaltyTicks: number; undoPenalty: number }
export type SolitaireGame = Board & { deal: number[]; options: SolitaireOptions; history: Board[]; elapsed: number; started: boolean; won: boolean }
export type SolitaireAction =
  | { type: 'draw' } | { type: 'undo' } | { type: 'flip'; column: number }
  | { type: 'move'; from: SolitaireSource; to: SolitaireTarget }
  | { type: 'tick'; seconds: number }

export function shuffledDeck(random = Math.random): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}
export function createSolitaireGame(options = defaultSolitaireOptions, deal = shuffledDeck()): SolitaireGame {
  if (deal.length !== 52 || new Set(deal).size !== 52 || deal.some((id) => !Number.isInteger(id) || id < 0 || id >= 52)) throw new Error('Baraja inválida.')
  const stock = [...deal]
  const tableau: TableauCard[][] = Array.from({ length: 7 }, () => [])
  for (let row = 0; row < 7; row++) for (let column = row; column < 7; column++) tableau[column].push({ id: stock.pop()!, faceUp: row === column })
  return { stock, tableau, waste: [], foundations: [[], [], [], []], score: 0, passes: 1, moves: 0, penaltyTicks: 0, undoPenalty: 0, deal: [...deal], options: { ...options }, history: [], elapsed: 0, started: false, won: false }
}
export function sourceCards(game: SolitaireGame, source: SolitaireSource): number[] {
  if (source.kind === 'waste') return game.waste.length ? [game.waste.at(-1)!] : []
  if (source.kind === 'foundation') {
    const pile = game.foundations[source.column]
    return pile?.length ? [pile.at(-1)!] : []
  }
  const pile = game.tableau[source.column]
  if (!pile || !Number.isInteger(source.index) || source.index < 0 || !pile[source.index]?.faceUp) return []
  const tail = pile.slice(source.index)
  return tail.every((card, i) => card.faceUp && (!i || cardRank(tail[i - 1].id) === cardRank(card.id) + 1 && isRedCard(tail[i - 1].id) !== isRedCard(card.id))) ? tail.map((card) => card.id) : []
}
export function canMoveSolitaire(game: SolitaireGame, from: SolitaireSource, to: SolitaireTarget): boolean {
  if (game.won || !Number.isInteger(to.column) || to.column < 0) return false
  if (from.kind !== 'waste' && from.kind === to.kind && from.column === to.column) return false
  const cards = sourceCards(game, from)
  if (!cards.length) return false
  if (to.kind === 'foundation') {
    const target = game.foundations[to.column]
    if (!target || cards.length !== 1 || from.kind === 'foundation') return false
    return target.length ? cardSuit(target[0]) === cardSuit(cards[0]) && cardRank(cards[0]) === target.length + 1 : cardRank(cards[0]) === 1
  }
  const pile = game.tableau[to.column]
  if (!pile) return false
  const top = pile.at(-1)
  return top ? top.faceUp && cardRank(top.id) === cardRank(cards[0]) + 1 && isRedCard(top.id) !== isRedCard(cards[0]) : cardRank(cards[0]) === 13
}
export function solitaireFoundationTarget(game: SolitaireGame, source: SolitaireSource): SolitaireTarget | null {
  for (let column = 0; column < 4; column++) {
    const target: SolitaireTarget = { kind: 'foundation', column }
    if (canMoveSolitaire(game, source, target)) return target
  }
  return null
}
function snapshot(game: SolitaireGame): Board {
  const { stock, waste, tableau, foundations, score, passes, moves, penaltyTicks, undoPenalty } = game
  return { stock, waste, tableau, foundations, score, passes, moves, penaltyTicks, undoPenalty }
}
function remember(game: SolitaireGame): SolitaireGame {
  return { ...game, history: [...game.history.slice(-199), snapshot(game)], started: true, moves: game.moves + 1 }
}
function points(game: SolitaireGame, delta: number) {
  return game.options.scoring ? Math.max(0, game.score + delta) : 0
}
export function solitaireReducer(game: SolitaireGame, action: SolitaireAction): SolitaireGame {
  if (action.type === 'tick') {
    if (!game.started || game.won || !game.options.timed || !Number.isFinite(action.seconds) || action.seconds <= 0) return game
    const elapsed = game.elapsed + action.seconds
    const penaltyTicks = Math.floor(elapsed / 10)
    return { ...game, elapsed, penaltyTicks, score: points(game, -(penaltyTicks - game.penaltyTicks) * 2) }
  }
  if (action.type === 'undo') {
    const previous = game.history.at(-1)
    if (!previous || game.won) return game
    return { ...game, ...previous, history: game.history.slice(0, -1), penaltyTicks: game.penaltyTicks, undoPenalty: game.undoPenalty + 2,
      score: game.options.scoring ? Math.max(0, previous.score - (game.penaltyTicks - previous.penaltyTicks) * 2 - (game.undoPenalty + 2 - previous.undoPenalty)) : 0 }
  }
  if (game.won) return game
  if (action.type === 'draw') {
    if (!game.stock.length && !game.waste.length) return game
    const next = remember(game)
    if (!game.stock.length) return { ...next, stock: [...game.waste].reverse(), waste: [], passes: game.passes + 1,
      score: points(game, game.options.draw === 1 ? -100 : game.passes >= 3 ? -20 : 0) }
    const stock = [...game.stock]
    const drawn: number[] = []
    for (let i = 0; i < game.options.draw && stock.length; i++) drawn.push(stock.pop()!)
    return { ...next, stock, waste: [...game.waste, ...drawn] }
  }
  if (action.type === 'flip') {
    const pile = game.tableau[action.column]
    if (!pile?.length || pile.at(-1)!.faceUp) return game
    return { ...remember(game), score: points(game, 5), tableau: game.tableau.map((cards, column) => column === action.column ? cards.map((card, i) => i === cards.length - 1 ? { ...card, faceUp: true } : card) : cards) }
  }
  if (!canMoveSolitaire(game, action.from, action.to)) return game
  const cards = sourceCards(game, action.from)
  const next = remember(game)
  next.tableau = game.tableau.map((pile) => [...pile])
  next.foundations = game.foundations.map((pile) => [...pile])
  if (action.from.kind === 'waste') next.waste = game.waste.slice(0, -1)
  else if (action.from.kind === 'foundation') next.foundations[action.from.column].pop()
  else next.tableau[action.from.column] = next.tableau[action.from.column].slice(0, action.from.index)
  if (action.to.kind === 'foundation') next.foundations[action.to.column].push(...cards)
  else next.tableau[action.to.column].push(...cards.map((id) => ({ id, faceUp: true })))
  next.score = points(game, action.to.kind === 'foundation' ? 10 : action.from.kind === 'foundation' ? -15 : action.from.kind === 'waste' ? 5 : 0)
  next.won = next.foundations.every((pile) => pile.length === 13)
  if (next.won && game.options.scoring && game.options.timed && game.elapsed >= 30) next.score += Math.floor(700000 / Math.floor(game.elapsed))
  return next
}
