import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    ignores: ["dist/*", "node_modules/*", "coverage/*", 'coverage'],
    rules: {
      "unicorn/no-array-callback-reference": 0
    }
  }
])
