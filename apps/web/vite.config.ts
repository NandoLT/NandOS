import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const wasm = createRequire(import.meta.url)('vite-plugin-wasm') as () => Plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm()],
  // Source modules let Rolldown split Three.js without pulling it into the desktop entry.
  resolve: { alias: [{ find: /^three$/, replacement: fileURLToPath(new URL('./node_modules/three/src/Three.js', import.meta.url)) }] },
  optimizeDeps: { exclude: ['@dimforge/rapier3d'] },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'writer-prosemirror', test: /node_modules\/prosemirror-/u },
            { name: 'pinball-three', test: /node_modules\/three\/src\//u, maxSize: 450_000, includeDependenciesRecursively: false },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
