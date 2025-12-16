import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    lib: {
      entry: resolve(__dirname, 'main.ts'),
      formats: ['es'],
      fileName: (format) => `main.${format === 'es' ? 'js' : format}`,
    },
    rollupOptions: {
      external: [
        'electron',
        'node:url',
        'node:path',
        'node:util',
        'node:child_process',
        'node:fs',
        'node:buffer',
        'node:stream',
        'node:http',
        'node:https',
        'node:net',
        'node:tls',
        'node:zlib',
        'node:process',
        'node:events',
        'node:os',
        'node:crypto',
        'node:querystring',
        'node:assert',
        'node:http2',
        'node:worker_threads',
        'fs',
        'path',
        'util',
        'child_process',
        'better-sqlite3',
        'dotenv',
        'googleapis',
        'google-auth-library',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
    },
  },
});

