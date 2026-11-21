// Flat config for ESLint 9.
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["**/dist/**", "**/out/**", "**/out-test/**", "**/node_modules/**", "**/coverage/**", "examples/**", "**/*.js", "**/*.mjs"],
  },
  {
    files: ["packages/*/src/**/*.ts", "packages/vscode/webview/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // packages/core must stay usable outside VS Code (CLI, npm): it may
    // import only its own modules, yaml and n3 (P1 spec 6.1). Relative
    // imports may not climb out of the package into another one.
    files: ["packages/core/src/**/*.ts"],
    ignores: ["packages/core/src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "vscode", message: "packages/core must not depend on the VS Code API." }],
          patterns: [
            {
              regex: "^(?!\\.{1,2}/)(?!(?:yaml|n3)$)",
              message: "packages/core may import only its own modules, yaml and n3.",
            },
            {
              regex: "\\.\\./(?:vscode|cli)/",
              message: "packages/core must not reach into another package.",
            },
          ],
        },
      ],
    },
  },
  {
    // packages/cli may depend only on packages/core and Node built-ins
    // (P1 spec 6.1); its tests may also use vitest.
    files: ["packages/cli/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "vscode", message: "packages/cli must not depend on the VS Code API." }],
          patterns: [
            {
              regex: "^(?!\\.{1,2}/)(?!(?:@yaggytter/object-ontology-core|vitest)$)(?!node:)",
              message: "packages/cli may import only its own modules, @yaggytter/object-ontology-core and node: built-ins.",
            },
            {
              regex: "\\.\\./(?:vscode|core)/",
              message: "packages/cli must use packages/core through its package name.",
            },
          ],
        },
      ],
    },
  },
  {
    // Core tests may additionally use the test runner and Node built-ins.
    files: ["packages/core/src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "vscode", message: "packages/core must not depend on the VS Code API." }],
          patterns: [
            {
              regex: "^(?!\\.{1,2}/)(?!(?:yaml|n3|vitest|ajv)$)(?!node:)",
              message: "packages/core tests may import only core modules, yaml, n3, vitest, ajv and node: built-ins.",
            },
            {
              regex: "\\.\\./(?:vscode|cli)/",
              message: "packages/core must not reach into another package.",
            },
          ],
        },
      ],
    },
  },
  {
    // .ttl-derived strings (labels, comments, IRIs, unattached-property
    // reasons, ...) flow into the Inspector/search/legend panels in volume
    // starting Phase 4. innerHTML is the one path that turns "open a
    // malicious ontology file" into "run script in the webview, which can
    // postMessage the host into editing files" — enforced mechanically here
    // rather than left as a code-review reminder. Route DOM construction
    // through webview/dom.ts's h(), which only accepts textContent.
    files: ["packages/vscode/webview/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "*",
          property: "innerHTML",
          message: "Do not use innerHTML in the webview — use dom.ts's h() (textContent only) instead.",
        },
      ],
    },
  },
  {
    // The one exception: main.ts's static, hardcoded page shell (no
    // document-derived content in it).
    files: ["packages/vscode/webview/main.ts"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
];
