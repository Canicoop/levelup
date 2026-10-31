/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Vitest reads this file, so tests share the @/ alias. They run in Node (the
  // default environment): only pure functions are tested for now.
  test: {
    // Unit tests sit next to the code they test.
    include: ['src/**/*.test.ts'],
    // A fixed time zone, so date tests give the same result on any machine and
    // in CI. Europe/Lisbon rather than UTC: its summer offset is what makes
    // toISODate differ from toISOString.
    env: { TZ: 'Europe/Lisbon' },
  },
})
