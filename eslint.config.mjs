import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.astro/**",
      "**/.vercel/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/.strapi/**",
      "**/build/**",
      "**/.sst/**",
      "apps/cms/types/generated/**",
      "sst.config.ts",
      ".agents/**",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.{ts,tsx,astro}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // TypeScript already resolves globals/types (e.g. Astro's ImageMetadata);
      // core no-undef gives false positives on them.
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Must be last: turns off stylistic rules that Prettier owns.
  eslintConfigPrettier,
);
