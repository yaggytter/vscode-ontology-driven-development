import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { parse } from "yaml";

/**
 * P1 acceptance criterion A5: the JSON Schema (used by editors for
 * completion and validation) accepts the existing samples and the P1
 * worked example.
 */
const CORE_ROOT = join(__dirname, "..");
const REPO_ROOT = join(CORE_ROOT, "..", "..");
const schema = JSON.parse(readFileSync(join(CORE_ROOT, "schemas", "object-ontology.schema.json"), "utf8"));
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);

const samplesDir = join(REPO_ROOT, "packages", "vscode", "samples");
const files = [
  ...readdirSync(samplesDir)
    .filter((name) => name.endsWith(".oont.yaml"))
    .map((name) => join(samplesDir, name)),
  join(REPO_ROOT, "examples", "claude-code", "object-ontology-mcp", "delivery", "delivery-ops.oont.yaml"),
  join(REPO_ROOT, "examples", "claude-code", "object-ontology-mcp", "support", "support-desk.oont.yaml"),
  join(CORE_ROOT, "fixtures", "room-booking.p1.oont.yaml"),
];

describe("JSON Schema accepts existing and P1 files (A5)", () => {
  it("finds the bundled samples", () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
  });

  for (const file of files) {
    it(file.slice(REPO_ROOT.length + 1), () => {
      const ok = validate(parse(readFileSync(file, "utf8")));
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });
  }

  it("rejects an invalid requirement ID and an unknown non-x field", () => {
    const bad = {
      objectOntology: 1,
      name: "Bad",
      requirements: { "REQ 1": "space in id" },
      "y-field": 1,
    };
    expect(validate(bad)).toBe(false);
  });
});
