import { defineConfig } from "@vscode/test-cli";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  files: "out-test/src/test/**/*.test.js",
  workspaceFolder: "./samples",
  // The default user-data dir (.vscode-test/user-data inside this package)
  // makes VS Code's IPC socket path exceed the Unix socket length limit
  // (~104 bytes) now that the extension sits in packages/vscode, both on
  // macOS and on GitHub's runners. A short temp path avoids that.
  launchArgs: ["--user-data-dir", join(tmpdir(), "oont-vscode-test")],
  mocha: {
    timeout: 20000,
  },
});
