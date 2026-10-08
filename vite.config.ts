import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3006,
    proxy: {
      '/odoo_api': {
        target: 'https://binaural-dev-onprotec-16.odoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/odoo_api/, '')
      }
    }
  },
  preview: {
    port: 3006
  }
})
