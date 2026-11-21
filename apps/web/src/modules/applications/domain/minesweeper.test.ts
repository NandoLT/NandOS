import { describe, expect, it } from 'vitest'
import { chordMineCell, createMineGame, markMineCell, mineLevels, mineNeighbors, mineSeconds, remainingMines, revealMineCell } from './minesweeper'
import type { MineGame } from './minesweeper'

function field(mines: number[]): MineGame {
  const game = createMineGame({ columns: 8, rows: 8, mines: mines.length })
  game.status = 'playing'
  game.startedAt = 1000
  game.cells.forEach((cell, index) => {
    cell.mine = mines.includes(index)
    cell.adjacent = mineNeighbors(index, game.config).filter((near) => mines.includes(near)).length
  })
  return game
}

describe('Buscaminas', () => {
  it('places the exact number of mines on the first reveal, keeps it safe and leaves the previous state untouched', () => {
    for (const config of Object.values(mineLevels)) {
      const initial = createMineGame(config)
      const started = revealMineCell(initial, 0, 1000, () => 0)
      expect(started.cells.filter((cell) => cell.mine)).toHaveLength(config.mines)
      expect(started.cells[0]).toMatchObject({ mine: false, revealed: true })
      expect(started.startedAt).toBe(1000)
      expect(initial.status).toBe('ready')
      expect(initial.cells.some((cell) => cell.mine || cell.revealed)).toBe(false)
      started.cells.forEach((cell, index) => expect(cell.adjacent).toBe(mineNeighbors(index, config).filter((near) => started.cells[near].mine).length))
    }
  })

  it('does not wrap neighbors across rows', () => {
    expect(mineNeighbors(0, mineLevels.beginner)).toEqual([1, 8, 9])
    expect(mineNeighbors(7, mineLevels.beginner)).toEqual([6, 14, 15])
    expect(mineNeighbors(27, mineLevels.beginner)).toHaveLength(8)
  })

  it('cycles flags/questions and protects flagged cells without starting the timer', () => {
    const initial = createMineGame()
    const flagged = markMineCell(initial, 0)
    expect(remainingMines(flagged)).toBe(9)
    expect(flagged.startedAt).toBeNull()
    expect(revealMineCell(flagged, 0)).toBe(flagged)
    const question = markMineCell(flagged, 0)
    expect(question.cells[0].mark).toBe('question')
    expect(remainingMines(question)).toBe(10)
    expect(markMineCell(question, 0).cells[0].mark).toBe('')
    expect(markMineCell(flagged, 0, false).cells[0].mark).toBe('')
  })

  it('opens connected empty cells, wins and freezes the game', () => {
    const initial = field([0])
    const won = revealMineCell(initial, 63, 4100)
    expect(won.status).toBe('won')
    expect(won.cells.filter((cell) => cell.revealed)).toHaveLength(63)
    expect(won.cells[0].mark).toBe('flag')
    expect(remainingMines(won)).toBe(0)
    expect(mineSeconds(won, 900000)).toBe(3)
    expect(markMineCell(won, 0)).toBe(won)
    expect(revealMineCell(won, 0)).toBe(won)
    expect(initial.cells.every((cell) => !cell.revealed)).toBe(true)
  })

  it('keeps flags during flood fill and lets a question mark be revealed', () => {
    const flagged = markMineCell(field([0]), 63)
    const open = revealMineCell(flagged, 62)
    expect(open.status).toBe('playing')
    expect(open.cells[63]).toMatchObject({ revealed: false, mark: 'flag' })
    const questioned = markMineCell(open, 63)
    expect(revealMineCell(questioned, 63).status).toBe('won')
  })

  it('loses on a mine, retains the explosion and blocks further moves', () => {
    const lost = revealMineCell(field([0, 9]), 9, 5000)
    expect(lost).toMatchObject({ status: 'lost', exploded: 9, endedAt: 5000 })
    expect(revealMineCell(lost, 1)).toBe(lost)
    expect(markMineCell(lost, 2)).toBe(lost)
  })

  it('opens neighbors of a numbered cell only with enough flags and can lose with incorrect flags', () => {
    const open = revealMineCell(field([0]), 1, 1100)
    expect(chordMineCell(open, 1)).toBe(open)
    const correct = markMineCell(open, 0)
    expect(chordMineCell(correct, 1, 4000).status).toBe('won')
    const incorrect = markMineCell(open, 2)
    expect(chordMineCell(incorrect, 1, 4000).status).toBe('lost')
  })

  it('validates custom fields and caps the clock at 999', () => {
    expect(() => createMineGame({ columns: 8, rows: 8, mines: 50 })).toThrow()
    expect(() => createMineGame({ columns: 31, rows: 8, mines: 10 })).toThrow()
    expect(() => createMineGame({ columns: 8, rows: 8.5, mines: 10 })).toThrow()
    expect(mineSeconds(createMineGame())).toBe(0)
    expect(mineSeconds(field([0]), 10000000)).toBe(999)
  })
})
