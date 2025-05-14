// @ts-check

import tseslint from 'typescript-eslint'
import love from 'eslint-config-love'
import stylisticTs from '@stylistic/eslint-plugin-ts'

export default tseslint.config(
  {
    ignores: ['./hacks', './db-migrations', './build', 'jest.config.cjs']
  },
  {
    files: ['**/*.ts']
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  love,
  {
    plugins: {
      '@stylistic/ts': stylisticTs
    },
    rules: {
      '@stylistic/ts/quotes': ['error', 'single'],
      '@stylistic/ts/indent': ['error', 2],
      '@stylistic/ts/semi': ['error', 'never'],
      'comma-dangle': ['error', 'never'],
      'promise/avoid-new': 'off',
      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'error',
      'prefer-const': 'off',
      'no-console': 'off',
      'max-nested-callbacks': 'off',
      'max-lines': 'off',
      'logical-assignment-operators': 'off',
      'guard-for-in': 'off',
      'eslint-comments/require-description': 'off',
      'eslint-comments/no-unlimited-disable': 'off',
      complexity: 'off',
      'arrow-body-style': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      '@typescript-eslint/prefer-return-this-type': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-destructuring': 'off',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/max-params': 'off',
      '@typescript-eslint/init-declarations': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/class-methods-use-this': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/array-type': 'off'
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json'
      }
    }
  }
)
