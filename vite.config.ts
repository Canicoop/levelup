/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The service worker, so the app opens without network. It precaches the
    // whole app (JS, CSS, fonts, icons and index.html) and serves index.html for
    // any navigation (a single-page app). It has no runtime caching, so requests
    // to Supabase (data and auth, another origin) always go to the network.
    // Production builds only: devOptions stays off, so `npm run dev` has none.
    VitePWA({
      // public/manifest.webmanifest and its link in index.html are kept as they are.
      manifest: false,
      // A new version waits for "Atualizar" (see src/lib/app-update.ts).
      registerType: 'prompt',
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Vitest reads this file, so tests share the @/ alias. They run in Node (the
  // default environment): pure functions, and mocks only where no pure function
  // can hold the rule (see Unit tests in docs/decisions.md).
  test: {
    // Unit tests sit next to the code they test.
    include: ['src/**/*.test.ts'],
    // A fixed time zone, so date tests give the same result on any machine and
    // in CI. Europe/Lisbon rather than UTC: its summer offset is what makes
    // toISODate differ from toISOString.
    env: { TZ: 'Europe/Lisbon' },
  },
})
