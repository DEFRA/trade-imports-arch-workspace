import neostandard from 'neostandard'

export default [
  ...neostandard({
    env: ['node'],
    ignores: ['coverage/**', 'node_modules/**']
  }),
  {
    files: ['src/commands/diagram/**/*.js'],
    ignores: ['**/*.test.js'],
    rules: {
      complexity: ['error', 6],
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }]
    }
  }
]
