import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import type { Plugin } from 'vite'
const wasm = createRequire(import.meta.url)('vite-plugin-wasm') as () => Plugin

// Vitest 5 runs transformed browser modules in Node; load WASM bytes through SSR.
const wasmForTests = wasm()
const loadWasm = wasmForTests.load
if (typeof loadWasm === 'function') {
  wasmForTests.load = function (id) { return loadWasm.call(this, id, { ssr: true }) }
}
export default defineConfig({
  plugins: [react(), wasmForTests],
  test: {
    server: { deps: { inline: ['@dimforge/rapier3d'] } },
    // Keep DOM workers within the laptop's capacity without weakening isolation
    // or extending assertion timeouts when API tests/dev servers run alongside.
    maxWorkers: 2,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
