/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  plugins: ["unused-imports"],
  rules: {
    "unused-imports/no-unused-imports": "error",
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: ["plugin:@typescript-eslint/recommended"],
      plugins: ["@typescript-eslint"],
      parser: "@typescript-eslint/parser",
      rules: {
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            prefer: "type-imports",
            // TODO: enable this once prettier supports it
            // fixStyle: "inline-type-imports",
            fixStyle: "separate-type-imports",
            disallowTypeAnnotations: false,
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            vars: "all",
            varsIgnorePattern: "^_",
            args: "after-used",
            argsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
          },
        ],
      },
    },
  ],
};
