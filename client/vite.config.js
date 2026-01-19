import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  base: '/',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        workout: resolve(__dirname, 'pages/workout.html'),
        profile: resolve(__dirname, 'pages/profile.html')
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    // Handle SPA-style routing for clean URLs
    middlewareMode: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js')
    }
  },
  // Rewrite URLs to serve HTML files
  appType: 'mpa'
});
