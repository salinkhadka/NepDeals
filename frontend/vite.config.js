<<<<<<< HEAD
=======

>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
<<<<<<< HEAD
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
=======

export default defineConfig({
  plugins: [react()],
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
  server: {
    https: {
      key: fs.readFileSync('./localhost+2-key.pem'),
      cert: fs.readFileSync('./localhost+2.pem'),
    },
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
