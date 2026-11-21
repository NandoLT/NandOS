import type { MineLevel } from '../domain/minesweeper'
export type MineRecords = Partial<Record<MineLevel, number>>
const storageKey = 'nandos:minesweeper:records:v1'
export function readMineRecords(): MineRecords {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (!value || typeof value !== 'object') return {}
    const records: MineRecords = {}
    for (const key of ['beginner', 'intermediate', 'expert'] as const) {
      const seconds = (value as Record<string, unknown>)[key]
      if (typeof seconds === 'number' && Number.isInteger(seconds) && seconds >= 0 && seconds <= 999) records[key] = seconds
    }
    return records
  } catch { return {} }
}
export function storeMineRecord(level: MineLevel, seconds: number): MineRecords {
  const records = readMineRecords()
  if (records[level] !== undefined && records[level] <= seconds) return records
  records[level] = seconds
  try { localStorage.setItem(storageKey, JSON.stringify(records)) } catch { /* The game remains playable without storage. */ }
  return records
}
