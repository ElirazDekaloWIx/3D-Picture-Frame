import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@core': resolve('src/renderer/src/core'),
        '@store': resolve('src/renderer/src/store'),
        '@scene': resolve('src/renderer/src/scene'),
        '@ui': resolve('src/renderer/src/ui'),
        '@io': resolve('src/renderer/src/io'),
        '@rendering': resolve('src/renderer/src/rendering'),
        '@workers': resolve('src/renderer/src/workers')
      }
    },
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      exclude: ['manifold-3d']
    },
    assetsInclude: ['**/*.wasm']
  }
})
