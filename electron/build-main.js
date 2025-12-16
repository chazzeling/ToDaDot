import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Build main.js
process.env.BUILD_TARGET = 'main';
const mainResult = await build({
  configFile: resolve(__dirname, 'vite.config.ts'),
});

console.log('Main build result:', mainResult);

// Build preload.cjs
process.env.BUILD_TARGET = 'preload';
const preloadResult = await build({
  configFile: resolve(__dirname, 'vite.config.ts'),
});

console.log('Preload build result:', preloadResult);
console.log('✅ Build complete!');

