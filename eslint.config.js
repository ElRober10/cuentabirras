// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["**/*.test.js"],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      // Los jest.mock() de arriba del todo tienen que ir ANTES que los
      // import (Jest los "hoistea" ahí igualmente, pero conviene que el
      // orden visible ya sea el real) — este patrón choca con la regla
      // general de import/first del resto del proyecto.
      "import/first": "off",
    },
  },
]);
