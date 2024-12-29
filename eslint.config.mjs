// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-empty-function': 0,
      '@typescript-eslint/restrict-template-expressions': 0,
      '@typescript-eslint/consistent-type-definitions': 0,
      '@typescript-eslint/consistent-indexed-object-style': 0,
      '@typescript-eslint': ["error", { "argsIgnorePattern": "^_" }],
    }
  }
);