import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: { outDir: 'dist' },
  server: { port: 3000 },
  optimizeDeps: {
    // MediaPipe is loaded via importmap in HTML, not bundled
    exclude: ['@mediapipe/tasks-vision']
  }
});
