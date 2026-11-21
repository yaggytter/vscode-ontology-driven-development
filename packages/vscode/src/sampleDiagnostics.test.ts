import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseObjectOntology } from "@yaggytter/object-ontology-core";

/**
 * P1 acceptance criterion A1: the diagnostics of the bundled samples and the
 * Claude Code examples must not change when the format grows (requirement
 * IDs, x- fields). The snapshot was taken before P1 was implemented.
 */
const PACKAGE_ROOT = join(__dirname, "..");
const REPO_ROOT = join(PACKAGE_ROOT, "..", "..");

const FILES = [
  "packages/vscode/samples/cafe-orders.oont.yaml",
  "packages/vscode/samples/delivery-ops.oont.yaml",
  "packages/vscode/samples/plant-maintenance.oont.yaml",
  "packages/vscode/samples/support-desk.oont.yaml",
  "examples/claude-code/object-ontology-mcp/delivery/delivery-ops.oont.yaml",
  "examples/claude-code/object-ontology-mcp/support/support-desk.oont.yaml",
  "packages/vscode/src/__fixtures__/legacy-diagnostics.oont.yaml",
];

function lineColumn(text: string, offset: number): string {
  const before = text.slice(0, offset).split("\n");
  return `${before.length}:${before[before.length - 1].length + 1}`;
}

describe("sample diagnostics are unchanged by format extensions (A1)", () => {
  for (const file of FILES) {
    it(file, () => {
      const text = readFileSync(join(REPO_ROOT, file), "utf8");
      const diagnostics = parseObjectOntology(text).diagnostics.map((d) => ({
        at: lineColumn(text, d.range.start),
        severity: d.severity,
        message: d.message,
      }));
      expect(diagnostics).toMatchSnapshot();
    });
  }
});
