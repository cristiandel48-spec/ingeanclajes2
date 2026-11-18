import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.wrangler']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Un componente usado en JSX sin importarlo (<Icono /> sin su import)
      // compila igual y solo revienta al abrir la pantalla: asi se cayo
      // Ejecucion de obra el 2026-11-13. Esta regla lo frena al compilar.
      'react/jsx-no-undef': ['error', { allowGlobals: true }],
      // Consejos del compilador de React y de la recarga en caliente: hablan
      // de rendimiento o de comodidad al programar, no de errores. Quedan como
      // aviso para que no frenen la publicacion; los errores de verdad
      // (variables sin definir, claves repetidas...) si la frenan.
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])
