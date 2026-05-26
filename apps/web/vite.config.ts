import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `VITE_HOST` lets the dev server bind to a custom interface (e.g. `0.0.0.0`
// inside docker-compose) without changing the `dev` script. Defaults to
// `127.0.0.1` so the Playwright E2E suite always finds the server on
// `http://localhost:5173`.
const host = process.env.VITE_HOST ?? '127.0.0.1';

export default defineConfig({
  plugins: [react()],
  server: {
    host,
    port: 5173,
    strictPort: true,
  },
});
