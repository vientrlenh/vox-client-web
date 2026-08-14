import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true, 
    port: 5173,
    proxy: {
      '/api': {
        changeOrigin: true,
        target: 'http://localhost:8081',
      },
      // Thêm proxy cho GraphQL tại đây
      '/graphql': {
        changeOrigin: true,
        target: 'http://localhost:8081',
      },
    },
  },
})
