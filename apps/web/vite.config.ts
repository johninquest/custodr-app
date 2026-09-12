import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api to the backend.
//
// The target must be overridable: when Vite runs on the HOST, `localhost:8080`
// is correct. When it runs inside the `custodr-app-web` container (docker
// compose dev stack), `localhost` is the web container itself and the API is
// reachable as `api:8080` on the shared network.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
