import { defineConfig } from 'vite';

export default defineConfig({
  // Relative URLs, so the build works wherever it's served from. It lives at
  // www.mark-eriksson.com/check/.
  base: './',
  build: {
    // Stockroom phones and PCs can be a few years old, so the JS and CSS are
    // built for browsers back to late 2020 (iOS 14). Without this Vite only
    // builds for recent ones, and its CSS minifier drops the fallbacks in
    // css/global.css for anything newer than these, e.g. container units.
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
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
