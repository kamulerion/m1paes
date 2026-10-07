'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');

/**
 * Configuración de ESLint para el frontend vanilla (classic scripts, sin
 * módulos). Los scripts comparten un ámbito global: `api`, helpers de
 * sesión, etc. se declaran como globals de sólo lectura.
 */
module.exports = [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  {
    files: ['frontend/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'react/jsx-uses-vars': 'error',
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }],
    },
  },
];
