const js = require("@eslint/js");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const globals = require("globals");
const babelParser = require("@babel/eslint-parser");

module.exports = [
  js.configs.recommended,
  {
    files: ["src/**/*.js", "src/**/*.jsx"],
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react"],
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
