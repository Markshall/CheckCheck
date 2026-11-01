import { defineConfig } from 'vite';

export default defineConfig({
  // Relative URLs, so the build works wherever it's served from. It lives at
  // www.mark-eriksson.com/check/.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    // 5173 is the portfolio's, so both can run at once.
    port: 5174,
    strictPort: true,
  },
});
