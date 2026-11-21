import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxy = {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: apiProxy,
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: apiProxy,
  },
});
