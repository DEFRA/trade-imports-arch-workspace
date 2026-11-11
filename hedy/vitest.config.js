import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.test.js',
        // The bin entry only wires commander to the commands; spawn tests
        // exercise it in a child process, which v8 coverage cannot see.
        'src/cli.js'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
})
