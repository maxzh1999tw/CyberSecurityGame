import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// base 用相對路徑：不論部署在網站根目錄或子路徑都能正常載入
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
