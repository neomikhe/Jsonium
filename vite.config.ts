import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const CHARSET_TAG = '<meta charset="UTF-8" />';
const THEME_COLOR = '#101317';

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
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Jsonium',
        short_name: 'Jsonium',
        description: 'Local-first JSON workbench. Zero network.',
        lang: 'en',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: './favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: './favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
    contentSecurityPolicy(),
  ],
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
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
