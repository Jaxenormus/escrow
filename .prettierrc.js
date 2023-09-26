/** @type {import("prettier").Config} */
module.exports = {
  bracketSpacing: true,
  bracketSameLine: true,
  singleQuote: false,
  jsxSingleQuote: false,
  trailingComma: "es5",
  semi: true,
  printWidth: 120,
  arrowParens: "always",
  importOrder: [
    "^@/src/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
};
