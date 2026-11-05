import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { studioApiPlugin } from './services/studio-api/index.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), studioApiPlugin()],
  // Generated downloads can be locked while Chrome is writing them on Windows.
  // They remain readable by the local server and are never application HMR inputs.
  server: { watch: { ignored: (file: string) => /(?:^|[\\/])(?:reports|output|work|update-backups|\.venv)(?:[\\/]|$)/.test(file) } },
})
