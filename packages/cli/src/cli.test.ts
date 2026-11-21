import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  agentToolsJson,
  buildContextSummary,
  objectOntologyToTurtle,
  parseObjectOntology,
} from "@yaggytter/object-ontology-core";
import { main, type CliIo } from "./cli";

/** P1 spec 6.2-6.4: `oont validate` and `oont export` (acceptance criteria A7, A8). */
const REPO_ROOT = join(__dirname, "..", "..", "..");
const P1_EXAMPLE = join(REPO_ROOT, "packages", "core", "fixtures", "room-booking.p1.oont.yaml");
const SAMPLE = join(REPO_ROOT, "packages", "vscode", "samples", "delivery-ops.oont.yaml");

const CLEAN = `objectOntology: 1
name: Clean
requirements:
  REQ-001: Book a room
objectTypes:
  Room:
    requirements: [REQ-001]
    primaryKey: id
    properties:
      id: string
`;
const WARNING_ONLY = CLEAN.replace("  REQ-001: Book a room\n", "  REQ-001: Book a room\n  REQ-008: Nobody uses this\n");
const WITH_ERROR = CLEAN.replace("requirements: [REQ-001]", "requirements: [REQ-001, REQ-010]");

let dir: string;

async function runAsync(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = "";
  let err = "";
  const io: CliIo = { cwd: dir, stdout: (text) => (out += text), stderr: (text) => (err += text) };
  const code = await main(args, io);
  return { code, out, err };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "oont-cli-"));
  writeFileSync(join(dir, "clean.oont.yaml"), CLEAN);
  writeFileSync(join(dir, "warning.oont.yaml"), WARNING_ONLY);
  writeFileSync(join(dir, "error.oont.yaml"), WITH_ERROR);
  writeFileSync(join(dir, "plain.yaml"), "just: yaml\n");
  writeFileSync(join(dir, "marker.yaml"), CLEAN);
  mkdirSync(join(dir, "tree", "nested"), { recursive: true });
  mkdirSync(join(dir, "tree", "node_modules"), { recursive: true });
  mkdirSync(join(dir, "tree", ".hidden"), { recursive: true });
  mkdirSync(join(dir, "empty"), { recursive: true });
  writeFileSync(join(dir, "tree", "a.oont.yaml"), CLEAN);
  writeFileSync(join(dir, "tree", "nested", "b.oont.yml"), WARNING_ONLY);
  writeFileSync(join(dir, "tree", "nested", "c.oont.json"), JSON.stringify({ objectOntology: 1, name: "Json" }));
  writeFileSync(join(dir, "tree", "nested", "ignored.yaml"), "not: checked\n");
  writeFileSync(join(dir, "tree", "node_modules", "x.oont.yaml"), WITH_ERROR);
  writeFileSync(join(dir, "tree", ".hidden", "y.oont.yaml"), WITH_ERROR);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("oont validate (A7)", () => {
  it("exits 0 and prints only the summary for a clean file", async () => {
    const result = await runAsync(["validate", "clean.oont.yaml"]);
    expect(result).toEqual({ code: 0, out: "1 file checked: 0 errors, 0 warnings\n", err: "" });
  });

  it("prints path:line:col: severity: message [code] and exits 1 on errors", async () => {
    const result = await runAsync(["validate", "error.oont.yaml"]);
    expect(result.code).toBe(1);
    const line = WITH_ERROR.split("\n").findIndex((l) => l.includes("REQ-010")) + 1;
    const column = WITH_ERROR.split("\n")[line - 1].indexOf("REQ-010") + 1;
    expect(result.out).toBe(
      `error.oont.yaml:${line}:${column}: error: Requirement "REQ-010" is not defined in requirements. [requirement-undefined]\n` +
        "1 file checked: 1 error, 0 warnings\n",
    );
  });

  it("exits 0 with warnings only, and 1 with --strict", async () => {
    const lenient = await runAsync(["validate", "warning.oont.yaml"]);
    expect(lenient.code).toBe(0);
    expect(lenient.out).toMatch(/^warning\.oont\.yaml:5:3: warning: Requirement "REQ-008" is not referenced by any element\. \[requirement-unreferenced\]\n/);
    expect(lenient.out).toContain("1 file checked: 0 errors, 1 warning\n");
    expect((await runAsync(["validate", "--strict", "warning.oont.yaml"])).code).toBe(1);
    expect((await runAsync(["validate", "--strict", "clean.oont.yaml"])).code).toBe(0);
  });

  it("omits [code] for diagnostics without a code", async () => {
    writeFileSync(join(dir, "legacy.oont.yaml"), "objectOntology: 1\nname: Legacy\nfoo: 1\n");
    const result = await runAsync(["validate", "legacy.oont.yaml"]);
    expect(result.out.split("\n")[0]).toMatch(/^legacy\.oont\.yaml:3:1: warning: Unknown field "foo" in the document\. Expected one of: .*\.$/);
  });

  it("walks directories for *.oont.yaml|yml|json, skipping node_modules and dot directories", async () => {
    const result = await runAsync(["validate", "tree"]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("3 files checked: 0 errors, 1 warning\n");
    expect(result.out).toContain(join("tree", "nested", "b.oont.yml"));
    expect(result.out).not.toContain("node_modules");
    expect(result.out).not.toContain(".hidden");
  });

  it("accepts several paths and counts every file", async () => {
    const result = await runAsync(["validate", "clean.oont.yaml", "error.oont.yaml", "warning.oont.yaml"]);
    expect(result.code).toBe(1);
    expect(result.out).toContain("3 files checked: 1 error, 1 warning\n");
  });

  it("writes the json format of P1 spec 6.3", async () => {
    const result = await runAsync(["validate", "--format", "json", "error.oont.yaml", "clean.oont.yaml"]);
    expect(result.code).toBe(1);
    const report = JSON.parse(result.out);
    const line = WITH_ERROR.split("\n").findIndex((l) => l.includes("REQ-010")) + 1;
    const column = WITH_ERROR.split("\n")[line - 1].indexOf("REQ-010") + 1;
    expect(report).toEqual({
      files: [
        {
          path: "error.oont.yaml",
          diagnostics: [
            {
              severity: "error",
              code: "requirement-undefined",
              message: 'Requirement "REQ-010" is not defined in requirements.',
              range: { start: { line, column }, end: { line, column: column + "REQ-010".length } },
            },
          ],
        },
        { path: "clean.oont.yaml", diagnostics: [] },
      ],
      summary: { files: 2, errors: 1, warnings: 0 },
    });
  });

  it("accepts a file without the .oont name when it starts with objectOntology", async () => {
    expect((await runAsync(["validate", "marker.yaml"])).code).toBe(0);
  });

  it("exits 2 for usage errors, unreadable paths, non-ontology files and empty directories", async () => {
    for (const args of [
      ["validate"],
      ["validate", "--format", "xml", "clean.oont.yaml"],
      ["validate", "--nope", "clean.oont.yaml"],
      ["validate", "missing.oont.yaml"],
      ["validate", "plain.yaml"],
      ["validate", "empty"],
      ["frobnicate"],
      [],
    ]) {
      const result = await runAsync(args);
      expect(result.code, args.join(" ")).toBe(2);
      expect(result.err, args.join(" ")).not.toBe("");
    }
  });

  it("checks the P1 worked example with no errors and no warnings (A2)", async () => {
    const result = await runAsync(["validate", "--strict", P1_EXAMPLE]);
    expect(result.code).toBe(0);
    expect(result.out).toBe("1 file checked: 0 errors, 0 warnings\n");
  });
});

describe("oont export (A8)", () => {
  for (const file of [SAMPLE, P1_EXAMPLE]) {
    const text = readFileSync(file, "utf8");
    const ontology = parseObjectOntology(text).ontology!;

    it(`tools matches the extension export for ${file.split("/").pop()}`, async () => {
      const result = await runAsync(["export", "tools", file]);
      expect(result.code).toBe(0);
      expect(result.out).toBe(agentToolsJson(ontology));
    });

    it(`summary matches the extension export for ${file.split("/").pop()}`, async () => {
      const result = await runAsync(["export", "summary", file]);
      expect(result.code).toBe(0);
      expect(result.out).toBe(buildContextSummary(ontology));
    });

    it(`turtle matches the extension export for ${file.split("/").pop()}`, async () => {
      const result = await runAsync(["export", "turtle", file]);
      expect(result.code).toBe(0);
      expect(result.out).toBe(await objectOntologyToTurtle(ontology));
    });
  }

  it("writes to -o instead of stdout", async () => {
    const result = await runAsync(["export", "summary", "clean.oont.yaml", "-o", "out.md"]);
    expect(result.code).toBe(0);
    expect(result.out).toBe("");
    expect(readFileSync(join(dir, "out.md"), "utf8")).toBe(buildContextSummary(parseObjectOntology(CLEAN).ontology!));
  });

  it("writes nothing and exits 1 when the input has errors, reporting them on stderr", async () => {
    const result = await runAsync(["export", "summary", "error.oont.yaml"]);
    expect(result.code).toBe(1);
    expect(result.out).toBe("");
    expect(result.err).toContain("[requirement-undefined]");
  });

  it("still exports with warnings, reporting them on stderr", async () => {
    const result = await runAsync(["export", "tools", "warning.oont.yaml"]);
    expect(result.code).toBe(0);
    expect(result.out).toBe(agentToolsJson(parseObjectOntology(WARNING_ONLY).ontology!));
    expect(result.err).toContain("[requirement-unreferenced]");
  });

  it("exits 2 for a missing kind, an unknown kind or a missing file", async () => {
    for (const args of [["export"], ["export", "pdf", "clean.oont.yaml"], ["export", "tools"], ["export", "tools", "missing.oont.yaml"]]) {
      expect((await runAsync(args)).code, args.join(" ")).toBe(2);
    }
  });
});

describe("oont --help and --version", () => {
  it("prints usage and the package version", async () => {
    const help = await runAsync(["--help"]);
    expect(help.code).toBe(0);
    expect(help.out).toContain("oont validate <path>...");
    expect(help.out).toContain("oont export tools");
    const version = await runAsync(["--version"]);
    expect(version.code).toBe(0);
    expect(version.out).toBe(`${JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")).version}\n`);
  });
});

