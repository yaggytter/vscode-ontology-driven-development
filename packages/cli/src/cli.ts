import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs, type ParseArgsConfig } from "node:util";
import {
  agentToolsJson,
  buildContextSummary,
  detectObjectOntology,
  objectOntologyToTurtle,
  OBJECT_ONTOLOGY_FILE_PATTERN,
  parseObjectOntology,
  type ObjectOntology,
  type OoDiagnostic,
} from "@yaggytter/object-ontology-core";

/**
 * `oont`: validate Object Ontology files and export them, outside VS Code
 * (P1 spec 6). Works on local files only — no network access, no telemetry.
 */

export interface CliIo {
  /** Directory that relative paths are resolved against and reported from. */
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
}

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_USAGE = 2;

const USAGE = `Usage:
  oont validate <path>... [--format text|json] [--strict]
  oont export tools   <file> [-o <out>]
  oont export summary <file> [-o <out>]
  oont export turtle  <file> [-o <out>]
  oont --help
  oont --version

validate  Checks *.oont.yaml, *.oont.yml and *.oont.json files. A directory is
          searched recursively, skipping node_modules and dot directories.
          Exit code 0: no errors (with --strict: no warnings either),
          1: errors (with --strict: or warnings), 2: usage or file problems.
export    Writes the agent tool definitions, the LLM context summary or the
          Turtle (RDF) projection, exactly as the VS Code extension does.
          Nothing is written when the file has errors.
`;

const defaultIo: CliIo = {
  cwd: process.cwd(),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

/** Raised for problems that end the run with exit code 2. */
class UsageError extends Error {}

export async function main(argv: readonly string[], io: CliIo = defaultIo): Promise<number> {
  try {
    const [command, ...rest] = argv;
    switch (command) {
      case "validate":
        return validateCommand(rest, io);
      case "export":
        return await exportCommand(rest, io);
      case "--help":
      case "-h":
        io.stdout(USAGE);
        return EXIT_OK;
      case "--version":
      case "-v":
        io.stdout(`${packageVersion()}\n`);
        return EXIT_OK;
      case undefined:
        throw new UsageError("Missing command.");
      default:
        throw new UsageError(`Unknown command "${command}".`);
    }
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(`oont: ${error.message}\n\n${USAGE}`);
      return EXIT_USAGE;
    }
    io.stderr(`oont: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_USAGE;
  }
}

function packageVersion(): string {
  const manifest = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version: string };
  return manifest.version;
}

function parse(args: readonly string[], options: NonNullable<ParseArgsConfig["options"]>) {
  try {
    return parseArgs({ args: [...args], options, allowPositionals: true, strict: true });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

// ---------------------------------------------------------------- validate

interface CheckedFile {
  /** As shown to the user: relative to cwd when the file is under it. */
  path: string;
  text: string;
  diagnostics: OoDiagnostic[];
}

function validateCommand(args: readonly string[], io: CliIo): number {
  const { values, positionals } = parse(args, {
    format: { type: "string", default: "text" },
    strict: { type: "boolean", default: false },
  });
  const format = values.format as string;
  if (format !== "text" && format !== "json") {
    throw new UsageError(`Unknown format "${format}". Use text or json.`);
  }
  if (positionals.length === 0) {
    throw new UsageError("validate needs at least one file or directory.");
  }

  const files = positionals.flatMap((path) => collectFiles(path, io));
  if (files.length === 0) {
    throw new UsageError(`No Object Ontology files (*.oont.yaml, *.oont.yml, *.oont.json) found in ${positionals.join(", ")}.`);
  }
  const checked = files.map((absolute) => checkFile(absolute, io));

  const errors = count(checked, "error");
  const warnings = count(checked, "warning");
  io.stdout(format === "json" ? jsonReport(checked, errors, warnings) : textReport(checked, errors, warnings));
  const failed = errors > 0 || (values.strict === true && warnings > 0);
  return failed ? EXIT_FAILED : EXIT_OK;
}

/** Files named on the command line are checked as given; directories are searched. */
function collectFiles(path: string, io: CliIo): string[] {
  const absolute = resolve(io.cwd, path);
  const stats = statOrThrow(absolute, path);
  if (stats.isDirectory()) {
    return walk(absolute);
  }
  const text = readOrThrow(absolute, path);
  if (detectObjectOntology(absolute, absolute.endsWith(".json") ? "json" : "yaml", text) === undefined) {
    throw new UsageError(`${path} is not an Object Ontology file (expected *.oont.yaml|yml|json or a first key objectOntology).`);
  }
  return [absolute];
}

function walk(directory: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
        out.push(...walk(path));
      }
    } else if (entry.isFile() && OBJECT_ONTOLOGY_FILE_PATTERN.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

function statOrThrow(absolute: string, shown: string) {
  try {
    return statSync(absolute);
  } catch {
    throw new UsageError(`Cannot read ${shown}: no such file or directory.`);
  }
}

function readOrThrow(absolute: string, shown: string): string {
  try {
    return readFileSync(absolute, "utf8");
  } catch (error) {
    throw new UsageError(`Cannot read ${shown}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function displayPath(absolute: string, io: CliIo): string {
  const fromCwd = relative(io.cwd, absolute);
  return fromCwd && !fromCwd.startsWith("..") && !isAbsolute(fromCwd) ? fromCwd : absolute;
}

function checkFile(absolute: string, io: CliIo): CheckedFile {
  const path = displayPath(absolute, io);
  const text = readOrThrow(absolute, path);
  return { path, text, diagnostics: parseObjectOntology(text).diagnostics };
}

function count(files: readonly CheckedFile[], severity: OoDiagnostic["severity"]): number {
  return files.reduce((sum, file) => sum + file.diagnostics.filter((d) => d.severity === severity).length, 0);
}

/** 1-based line and column of a source offset (P1 spec 6.3). */
function position(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function diagnosticLine(file: CheckedFile, diagnostic: OoDiagnostic): string {
  const { line, column } = position(file.text, diagnostic.range.start);
  const code = diagnostic.code ? ` [${diagnostic.code}]` : "";
  return `${file.path}:${line}:${column}: ${diagnostic.severity}: ${diagnostic.message}${code}`;
}

function textReport(files: readonly CheckedFile[], errors: number, warnings: number): string {
  const lines = files.flatMap((file) => file.diagnostics.map((d) => diagnosticLine(file, d)));
  lines.push(`${plural(files.length, "file")} checked: ${plural(errors, "error")}, ${plural(warnings, "warning")}`);
  return `${lines.join("\n")}\n`;
}

function jsonReport(files: readonly CheckedFile[], errors: number, warnings: number): string {
  const report = {
    files: files.map((file) => ({
      path: file.path,
      diagnostics: file.diagnostics.map((d) => ({
        severity: d.severity,
        ...(d.code ? { code: d.code } : {}),
        message: d.message,
        range: { start: position(file.text, d.range.start), end: position(file.text, d.range.end) },
      })),
    })),
    summary: { files: files.length, errors, warnings },
  };
  return `${JSON.stringify(report, null, 2)}\n`;
}

// ------------------------------------------------------------------ export

const EXPORTERS: Record<string, (ontology: ObjectOntology) => string | Promise<string>> = {
  tools: agentToolsJson,
  summary: (ontology) => buildContextSummary(ontology),
  turtle: objectOntologyToTurtle,
};

async function exportCommand(args: readonly string[], io: CliIo): Promise<number> {
  const { values, positionals } = parse(args, { output: { type: "string", short: "o" } });
  const [kind, file, ...extra] = positionals;
  if (kind === undefined || !(kind in EXPORTERS)) {
    throw new UsageError(kind === undefined ? "export needs a kind: tools, summary or turtle." : `Unknown export "${kind}". Use tools, summary or turtle.`);
  }
  if (file === undefined || extra.length > 0) {
    throw new UsageError("export needs exactly one file.");
  }
  const absolute = resolve(io.cwd, file);
  statOrThrow(absolute, file);
  const checked = checkFile(absolute, io);
  for (const diagnostic of checked.diagnostics) {
    io.stderr(`${diagnosticLine(checked, diagnostic)}\n`);
  }
  const parsed = parseObjectOntology(checked.text);
  if (!parsed.ontology || checked.diagnostics.some((d) => d.severity === "error")) {
    return EXIT_FAILED;
  }
  const output = await EXPORTERS[kind](parsed.ontology);
  if (typeof values.output === "string") {
    writeFileSync(resolve(io.cwd, values.output), output);
  } else {
    io.stdout(output);
  }
  return EXIT_OK;
}
