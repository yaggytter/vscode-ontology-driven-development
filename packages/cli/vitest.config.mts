import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve workspace packages to their TypeScript sources ("source" export
  // condition) so tests never depend on a stale build of packages/core.
  resolve: { conditions: ["source"] },
  ssr: { resolve: { conditions: ["source"] } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
