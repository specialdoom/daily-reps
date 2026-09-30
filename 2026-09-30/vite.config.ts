/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  test: {
    projects: [
      {
        extends: true,
        // A DOM environment makes Vitest compile runes for the client, where effects run.
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.ssr.test.ts'],
        },
        resolve: { conditions: ['browser'] },
      },
      {
        extends: true,
        // The node environment compiles runes for the server, as SSR would.
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.ssr.test.ts'],
        },
      },
    ],
  },
})
