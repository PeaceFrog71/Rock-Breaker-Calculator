import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import electron from 'vite-plugin-electron'
// import electronRenderer from 'vite-plugin-electron-renderer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Electron plugin temporarily disabled for web development
    // electron([
    //   {
    //     entry: 'electron/main.ts',
    //     vite: {
    //       build: {
    //         outDir: 'dist-electron',
    //         rollupOptions: {
    //           external: ['electron'],
    //           output: {
    //             format: 'cjs'
    //           }
    //         }
    //       }
    //     }
    //   },
    // ]),
    // electronRenderer(),
  ],
  base: '/',
  server: {
    port: 5173,
    host: true
  }
})
