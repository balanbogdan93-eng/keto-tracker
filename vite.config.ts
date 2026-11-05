import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/, set via VITE_BASE in the workflow
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    host: true, // expose on local network (0.0.0.0)
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
