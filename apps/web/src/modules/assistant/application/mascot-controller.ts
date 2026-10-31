export type MascotMode = 'idle' | 'listening' | 'thinking'

export type MascotExpression = MascotMode | 'answer'

export interface MascotController {
  select(mode: MascotMode): void
  answer(): void
}
