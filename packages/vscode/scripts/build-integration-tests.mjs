// Bundles the VS Code integration tests (src/test/*.test.ts) into
// out-test/src/test/ for @vscode/test-cli. They are bundled rather than
// compiled with tsc because they import @yaggytter/object-ontology-core,
// whose entry point is TypeScript source that the extension host cannot
// require directly. Type checking stays with tsc (see pretest:integration).
import * as esbuild from "esbuild";
import { readdirSync } from "node:fs";

const entryPoints = readdirSync("src/test")
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => `src/test/${name}`);

await esbuild.build({
  entryPoints,
  outdir: "out-test/src/test",
  bundle: true,
  conditions: ["source"],
  platform: "node",
  target: "node20",
  format: "cjs",
  external: ["vscode"],
  sourcemap: true,
  logLevel: "info",
});
