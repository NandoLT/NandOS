export const mineLevels = {
  beginner: { label: 'Principiante', columns: 8, rows: 8, mines: 10 },
  intermediate: { label: 'Intermedio', columns: 16, rows: 16, mines: 40 },
  expert: { label: 'Experto', columns: 30, rows: 16, mines: 99 },
} as const
export type MineLevel = keyof typeof mineLevels
export type MineConfig = { columns: number; rows: number; mines: number }
export type MineCell = { mine: boolean; adjacent: number; revealed: boolean; mark: '' | 'flag' | 'question' }
export type MineGame = {
  config: MineConfig
  cells: MineCell[]
  status: 'ready' | 'playing' | 'won' | 'lost'
  startedAt: number | null
  endedAt: number | null
  exploded: number | null
}

export function createMineGame(config: MineConfig = mineLevels.beginner): MineGame {
  const { columns, rows, mines } = config
  if (![columns, rows, mines].every(Number.isInteger) || columns < 8 || columns > 30 || rows < 8 || rows > 24 || mines < 1 || mines > (columns - 1) * (rows - 1)) {
    throw new Error('Usa entre 8 y 30 columnas, entre 8 y 24 filas y un número de minas válido.')
  }
  return { config: { ...config }, cells: Array.from({ length: columns * rows }, () => ({ mine: false, adjacent: 0, revealed: false, mark: '' })), status: 'ready', startedAt: null, endedAt: null, exploded: null }
}

export function mineNeighbors(index: number, config: MineConfig): number[] {
  const x = index % config.columns
  const y = Math.floor(index / config.columns)
  const result: number[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!(dx || dy)) continue
    if (x + dx >= 0 && x + dx < config.columns && y + dy >= 0 && y + dy < config.rows) result.push((y + dy) * config.columns + x + dx)
  }
  return result
}

function seedMines(game: MineGame, safe: number, random: () => number) {
  // Place only after the first reveal; shuffle candidates without retry loops.
  const candidates = game.cells.map((_, index) => index).filter((index) => index !== safe)
  for (let i = 0; i < game.config.mines; i++) {
    const j = i + Math.floor(random() * (candidates.length - i))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    game.cells[candidates[i]].mine = true
  }
  game.cells.forEach((cell, index) => { cell.adjacent = mineNeighbors(index, game.config).filter((near) => game.cells[near].mine).length })
}

export function markMineCell(game: MineGame, index: number, questions = true): MineGame {
  const cell = game.cells[index]
  if (!cell || cell.revealed || game.status === 'won' || game.status === 'lost') return game
  return { ...game, cells: game.cells.map((current, i) => i === index ? { ...current, mark: current.mark === '' ? 'flag' : current.mark === 'flag' && questions ? 'question' : '' } : current) }
}

export function revealMineCell(game: MineGame, index: number, now = Date.now(), random = Math.random): MineGame {
  const target = game.cells[index]
  if (!target || target.mark === 'flag' || target.revealed || game.status === 'won' || game.status === 'lost') return game
  const next: MineGame = { ...game, cells: game.cells.map((cell) => ({ ...cell })) }
  if (next.status === 'ready') {
    seedMines(next, index, random)
    next.status = 'playing'
    next.startedAt = now
  }
  return uncover(next, [index], now)
}

function uncover(game: MineGame, pending: number[], now: number): MineGame {
  while (pending.length) {
    const index = pending.pop()!
    const cell = game.cells[index]
    if (cell.revealed || cell.mark === 'flag') continue
    cell.revealed = true
    cell.mark = ''
    if (cell.mine) {
      game.status = 'lost'
      game.exploded = index
      game.endedAt = now
      return game
    }
    if (!cell.adjacent) pending.push(...mineNeighbors(index, game.config))
  }
  if (game.cells.every((cell) => cell.mine || cell.revealed)) {
    game.status = 'won'
    game.endedAt = now
    game.cells.forEach((cell) => { if (cell.mine) cell.mark = 'flag' })
  }
  return game
}

export function chordMineCell(game: MineGame, index: number, now = Date.now()): MineGame {
  const cell = game.cells[index]
  if (game.status !== 'playing' || !cell?.revealed || !cell.adjacent) return game
  const nearby = mineNeighbors(index, game.config)
  if (nearby.filter((near) => game.cells[near].mark === 'flag').length !== cell.adjacent) return game
  return uncover({ ...game, cells: game.cells.map((current) => ({ ...current })) }, nearby, now)
}

export function mineSeconds(game: MineGame, now = Date.now()) {
  return game.startedAt === null ? 0 : Math.min(999, Math.max(0, Math.floor(((game.endedAt ?? now) - game.startedAt) / 1000)))
}
export function remainingMines(game: MineGame) {
  return game.config.mines - game.cells.filter((cell) => cell.mark === 'flag').length
}
