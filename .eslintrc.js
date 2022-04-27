module.exports = {
  env: { es6: true },
  parserOptions: {
    sourceType: 'module',
    project: 'tsconfig.eslint.json',
    
  },
  extends: ['airbnb-base', 'airbnb-typescript/base', 'plugin:prettier/recommended'],
  plugins: ['prettier', 'simple-import-sort'],
  ignorePatterns: ['node_modules/*', 'build/*'],
  rules: {
    'prettier/prettier': ['error',{endOfLine: 'auto'}],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'import/extensions': 'off',
    'class-methods-use-this': 'off',
    '@typescript-eslint/naming-convention': 'off',
    'import/no-cycle': 'off',
  },
};
