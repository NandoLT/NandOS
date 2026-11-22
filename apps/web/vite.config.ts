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
            // Keep foundational types ahead of shaders/renderers: size-based partitions
            // can create circular chunks and evaluate uniforms before Color exists.
            { name: 'pinball-math', priority: 40, test: /node_modules\/three\/src\/(?:math\/|constants\.js|utils\.js|renderers\/shaders\/(?:UniformsUtils\.js|ShaderChunk\/default_(?:vertex|fragment)\.glsl\.js))/u, includeDependenciesRecursively: false },
            { name: 'pinball-shaders', priority: 30, test: /node_modules\/three\/src\/renderers\/shaders\//u, includeDependenciesRecursively: false },
            { name: 'pinball-renderer', priority: 20, test: /node_modules\/three\/src\/(?:renderers\/|extras\/PMREMGenerator\.js)/u, includeDependenciesRecursively: false },
            { name: 'pinball-core', priority: 10, test: (id: string) => id.includes('/node_modules/three/src/') && !/\/Three[^/]*\.js$/u.test(id), includeDependenciesRecursively: false },
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
