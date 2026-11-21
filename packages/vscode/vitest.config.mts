import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve workspace packages to their TypeScript sources ("source" export
  // condition) so tests never depend on a stale build of packages/core.
  resolve: { conditions: ["source"] },
  ssr: { resolve: { conditions: ["source"] } },
  test: {
    include: ["src/**/*.test.ts", "webview/**/*.test.ts"],
    exclude: ["src/test/**"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/rdf/**", "src/edit/**", "src/objectOntology/**"],
      // VS Code-bound glue is exercised by the integration suite instead.
      exclude: ["src/objectOntology/commands.ts"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
