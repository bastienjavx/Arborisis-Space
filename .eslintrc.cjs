/**
 * Config ESLint racine pour les packages Node/TS (shared, api).
 * Le front Next.js (apps/web) utilise sa propre config (next/core-web-vitals).
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true, jest: true },
  ignorePatterns: [
    'dist',
    '.next',
    'node_modules',
    'coverage',
    '**/*.config.*',
    '**/*.js',
    'apps/web/**',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
  },
};
