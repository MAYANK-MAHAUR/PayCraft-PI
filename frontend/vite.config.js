import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Keep SSE streams (real-time notifications / live numbers) unbuffered
        // so the browser receives payment events the moment they happen.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Connection', 'keep-alive');
          });
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Cache-Control'] = 'no-cache, no-transform';
            proxyRes.headers['X-Accel-Buffering'] = 'no';
            delete proxyRes.headers['content-length'];
          });
        },
      },
    },
  },
});
