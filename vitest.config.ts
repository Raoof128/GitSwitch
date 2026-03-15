import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./src/renderer/src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'src/renderer/src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/renderer/src/main.tsx'
      ],
      thresholds: {
        statements: 12,
        branches: 8,
        functions: 8,
        lines: 12
      }
    }
  }
})
