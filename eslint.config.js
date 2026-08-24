import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const NETWORK_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((name) => ({
  name,
  message: 'Jsonium no hace peticiones de red despues de la carga inicial.',
}));

const FORBIDDEN_SYNTAX = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'El contenido del documento se pinta como texto, nunca como HTML.',
  },
  {
    selector: "MemberExpression[property.name='innerHTML']",
    message: 'innerHTML permite XSS con entrada del usuario. Usa textContent.',
  },
  {
    selector: "MemberExpression[object.name='navigator'][property.name='sendBeacon']",
    message: 'Jsonium no envia telemetria.',
  },
  {
    selector: "AssignmentExpression[left.property.name='__proto__']",
    message: 'Prototype pollution: nunca asignes __proto__.',
  },
];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'bench/fixtures', 'node_modules', '.claude'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

      'no-restricted-globals': ['error', ...NETWORK_GLOBALS],
      'no-restricted-syntax': ['error', ...FORBIDDEN_SYNTAX],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',

      'max-params': ['error', 3],
      'max-depth': ['error', 2],
      complexity: ['error', 10],
      'no-magic-numbers': [
        'error',
        { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true, enforceConst: true },
      ],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'no-magic-numbers': 'off', complexity: 'off' },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off', 'no-magic-numbers': 'off' },
  },
);
