import { defineConfig } from "vitest/config";

// Runs every package's unit tests together so coverage is measured over the
// same code and the same tests as before the core/vscode split
// (`npm run test:coverage`). Each project keeps its own vitest.config.mts.
export default defineConfig({
  // Resolve workspace packages to their TypeScript sources ("source" export
  // condition) so tests never depend on a stale build of packages/core.
  resolve: { conditions: ["source"] },
  ssr: { resolve: { conditions: ["source"] } },
  test: {
    projects: ["packages/core", "packages/cli", "packages/vscode"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "packages/core/src/**",
        "packages/cli/src/**",
        "packages/vscode/src/rdf/**",
        "packages/vscode/src/edit/**",
        "packages/vscode/src/objectOntology/**",
      ],
      // VS Code-bound glue is exercised by the integration suite instead.
      exclude: ["packages/vscode/src/objectOntology/commands.ts", "**/*.test.ts"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
