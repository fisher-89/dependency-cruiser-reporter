import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    ignorePatterns: ['/openspec', '/demo', '/packages/rust', '/*.*'],
    singleQuote: true,
    sortImports: true,
  },
  lint: {
    ignorePatterns: ['/openspec', '/demo', '/packages/rust', '/*.*'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'no-duplicate-imports': ['error'],
      'typescript/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'import/no-duplicates': 'error',
    },
    overrides: [
      { files: ['*.test.ts', '*.spec.ts'], rules: { 'typescript/no-floating-promises': 'off' } },
    ],
  },
});
