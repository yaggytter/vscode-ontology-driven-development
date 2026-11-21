// The public documents live at the workspace root, but vsce packages only
// the extension directory. Copy everything the VSIX has always shipped
// (README, CHANGELOG, LICENSE, policies, notices and docs/) into
// packages/vscode before packaging. The copies are gitignored.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..");

const ROOT_DOCUMENT = /^(?:README|CHANGELOG|CONTRIBUTING|PRIVACY|SECURITY|SUPPORT)(?:\.ja)?\.md$|^THIRD_PARTY_NOTICES\.md$|^LICENSE$/;
// Maintainer-only notes that are gitignored at the root and never shipped.
const EXCLUDED_DOC_DIRS = new Set(["plans"]);

const documents = readdirSync(repoRoot).filter((name) => ROOT_DOCUMENT.test(name));
if (!documents.includes("README.md") || !documents.includes("LICENSE")) {
  throw new Error(`README.md and LICENSE must exist at ${repoRoot}`);
}
for (const name of documents) {
  cpSync(resolve(repoRoot, name), resolve(packageRoot, name));
}

const docsTarget = resolve(packageRoot, "docs");
if (existsSync(docsTarget)) {
  rmSync(docsTarget, { recursive: true });
}
cpSync(resolve(repoRoot, "docs"), docsTarget, {
  recursive: true,
  filter: (source) => !source.split(/[\\/]/).some((part, index, parts) => parts[index - 1] === "docs" && EXCLUDED_DOC_DIRS.has(part)),
});

console.log(`Copied ${documents.length} root documents and docs/ into ${packageRoot}`);
