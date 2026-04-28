import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:1010',
        changeOrigin: true,
        secure: false,
        // Forward cookies (HttpOnly refresh token) correctly through the proxy
        cookieDomainRewrite: 'localhost',
      }
    }
  }
})

