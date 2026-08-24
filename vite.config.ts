import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const CHARSET_TAG = '<meta charset="UTF-8" />';

function contentSecurityPolicy(): Plugin {
  return {
    name: 'jsonium-csp',
    apply: 'build',
    transformIndexHtml(html) {
      if (!html.includes(CHARSET_TAG)) {
        throw new Error('index.html sin charset: no se pudo inyectar la CSP');
      }
      const meta = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
      return html.replace(CHARSET_TAG, `${CHARSET_TAG}\n    ${meta}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    modulePreload: { polyfill: false },
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
