import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5306,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4306,
    strictPort: true,
  },
});
