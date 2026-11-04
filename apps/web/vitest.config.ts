import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Keep DOM workers within the laptop's capacity without weakening isolation
    // or extending assertion timeouts when API tests/dev servers run alongside.
    maxWorkers: 2,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
