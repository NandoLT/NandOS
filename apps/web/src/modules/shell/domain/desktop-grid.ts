import type { DesktopPosition } from './types'

const GRID = {
  originX: 18,
  originY: 24,
  columnWidth: 104,
  rowHeight: 84,
  iconWidth: 88,
  iconHeight: 76,
  taskbarHeight: 42,
} as const

type DesktopBounds = {
  width: number
  height: number
  taskbarHeight?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toCell(position: DesktopPosition, maxColumn: number, maxRow: number) {
  return {
    column: clamp(Math.round((position.x - GRID.originX) / GRID.columnWidth), 0, maxColumn),
    row: clamp(Math.round((position.y - GRID.originY) / GRID.rowHeight), 0, maxRow),
  }
}

export function findNearestDesktopGridPosition(
  position: DesktopPosition,
  bounds: DesktopBounds,
  occupiedPositions: DesktopPosition[] = []
): DesktopPosition {
  const maxColumn = Math.max(
    0,
    Math.floor((bounds.width - GRID.originX - GRID.iconWidth) / GRID.columnWidth)
  )
  const maxRow = Math.max(
    0,
    Math.floor(
      (bounds.height - (bounds.taskbarHeight ?? GRID.taskbarHeight) - GRID.originY - GRID.iconHeight) / GRID.rowHeight
    )
  )
  const occupiedCells = new Set(
    occupiedPositions.map((occupied) => {
      const cell = toCell(occupied, maxColumn, maxRow)
      return `${cell.column}:${cell.row}`
    })
  )

  const candidates: Array<DesktopPosition & { column: number; row: number; distance: number }> = []
  for (let row = 0; row <= maxRow; row += 1) {
    for (let column = 0; column <= maxColumn; column += 1) {
      const x = GRID.originX + column * GRID.columnWidth
      const y = GRID.originY + row * GRID.rowHeight
      candidates.push({
        x,
        y,
        column,
        row,
        distance: (position.x - x) ** 2 + (position.y - y) ** 2,
      })
    }
  }

  candidates.sort(
    (left, right) =>
      left.distance - right.distance || left.row - right.row || left.column - right.column
  )

  const nearestCell = candidates.find(
    (candidate) => !occupiedCells.has(`${candidate.column}:${candidate.row}`)
  ) ?? candidates[0]

  return nearestCell ? { x: nearestCell.x, y: nearestCell.y } : { x: GRID.originX, y: GRID.originY }
}
