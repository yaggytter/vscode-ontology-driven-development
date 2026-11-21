# CLI Reference (`oont`)

`oont` checks and exports Object Ontology files outside VS Code: in a terminal, in CI, or from an AI coding agent such as Claude Code. It uses the same core library as the extension, so it reports the same diagnostics and writes the same exports.

`oont` works on local files only. It makes no network requests and sends no telemetry.

## Install

The CLI will be published to npm as **`@yaggytter/object-ontology-cli`**, with the command `oont`. It has not been published yet. Until then, run it from a clone of this repository (Node.js 20 or later):

```sh
git clone https://github.com/yaggytter/vscode-ontology-driven-development.git
cd vscode-ontology-driven-development
npm ci
npm run build
node packages/cli/bin/oont.js --help
```

In the examples below, `oont` stands for `node <path-to-clone>/packages/cli/bin/oont.js`. A shell alias makes them work as written:

```sh
alias oont="node $PWD/packages/cli/bin/oont.js"
```

## Commands

```text
oont validate <path>... [--format text|json] [--strict]
oont export tools   <file> [-o <out>]
oont export summary <file> [-o <out>]
oont export turtle  <file> [-o <out>]
oont --help
oont --version
```

| Command | What it does |
| --- | --- |
| `validate` | Checks one or more files or directories and prints the diagnostics. |
| `export tools` | Writes the action types as AI-agent tool definitions (JSON Schema), like **ODD: Export Actions as AI Agent Tools (JSON Schema)...**. |
| `export summary` | Writes the Markdown summary for an LLM's context, like **ODD: Export Ontology Summary for LLM Context...**. |
| `export turtle` | Writes the RDF projection as Turtle, like **ODD: Export Object Ontology as Turtle (OWL)...**. |
| `--help`, `-h` | Prints the usage text. |
| `--version`, `-v` | Prints the CLI version. |

## `oont validate`

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `--format text` | yes | One line per diagnostic, then a summary line. |
| `--format json` | | A JSON report on standard output. |
| `--strict` | off | Treat warnings as failures (exit code 1). |

### Which files are checked

- Each `<path>` is a file or a directory. You can give several.
- **A directory** is searched recursively for `*.oont.yaml`, `*.oont.yml` and `*.oont.json`. `node_modules` and directories whose names start with `.` are skipped. Files with other names are not picked up, even if they start with `objectOntology:`.
- **A file named on the command line** is checked if its name is `*.oont.*`, or if its first key is `objectOntology` (the same rule the extension uses for untitled documents). Any other file is a usage error with exit code 2.
- Wildcards are expanded by your shell, not by `oont`.
- Paths under the current directory are printed relative to it. Other paths are printed as absolute paths.

### Text output

Each diagnostic is one line, `path:line:column: severity: message [code]`. Lines and columns start at 1, so VS Code's terminal turns them into clickable links. Diagnostics without a code have no `[...]` part. The last line counts files, errors and warnings. The examples on this page use the file from the [ODD tutorial](../odd/tutorial-requirements-to-ontology.md) with a typo (`REQ-04`) in one reference.

```text
$ oont validate room-booking.oont.yaml
room-booking.oont.yaml:85:20: error: Requirement "REQ-04" is not defined in requirements. [requirement-undefined]
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
1 file checked: 1 error, 2 warnings
```

A clean run prints only the summary:

```text
$ oont validate packages/vscode/samples examples
7 files checked: 0 errors, 0 warnings
```

### JSON output

`--format json` prints one report. `code` is present only when the diagnostic has one. `range` gives 1-based start and end positions.

```text
$ oont validate room-booking.oont.yaml --format json
```

```json
{
  "files": [
    {
      "path": "room-booking.oont.yaml",
      "diagnostics": [
        {
          "severity": "error",
          "code": "requirement-undefined",
          "message": "Requirement \"REQ-04\" is not defined in requirements.",
          "range": {
            "start": {
              "line": 85,
              "column": 20
            },
            "end": {
              "line": 85,
              "column": 26
            }
          }
        },
        {
          "severity": "warning",
          "code": "requirement-unreferenced",
          "message": "Requirement \"REQ-005\" is not referenced by any element.",
          "range": {
            "start": {
              "line": 10,
              "column": 3
            },
            "end": {
              "line": 10,
              "column": 10
            }
          }
        },
        {
          "severity": "warning",
          "code": "requirement-unreferenced",
          "message": "Requirement \"REQ-006\" is not referenced by any element.",
          "range": {
            "start": {
              "line": 11,
              "column": 3
            },
            "end": {
              "line": 11,
              "column": 10
            }
          }
        }
      ]
    }
  ],
  "summary": {
    "files": 1,
    "errors": 1,
    "warnings": 2
  }
}
```

The diagnostic codes are listed in the [format reference](object-ontology-format.md#requirement-diagnostics).

## `oont export`

```sh
oont export summary room-booking.oont.yaml            # to standard output
oont export tools room-booking.oont.yaml -o tools.json
```

- The kind is `tools`, `summary` or `turtle`, and exactly one file follows it.
- Without `-o`, the output goes to standard output. With `-o <out>`, it is written to that file (relative to the current directory), replacing any existing file.
- The output is identical to the extension's export of the same name. For example, `oont export tools` on the delivery sample in `examples/claude-code/object-ontology-mcp/delivery/` reproduces the shipped `delivery-ops.tools.json` byte for byte.
- Diagnostics are printed to standard error. **If the file has errors, nothing is written** and the exit code is 1. Warnings alone do not stop the export.

```text
$ oont export summary room-booking.oont.yaml
room-booking.oont.yaml:85:20: error: Requirement "REQ-04" is not defined in requirements. [requirement-undefined]
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
```

`export` does not check the file name. A file that is not an Object Ontology fails with its diagnostics and exit code 1, not 2:

```text
$ oont export summary notes.yaml
notes.yaml:1:1: warning: Unknown field "a" in the document. Expected one of: objectOntology, name, description, namespace, objectTypes, interfaces, linkTypes, actionTypes, objects, requirements.
notes.yaml:1:1: error: Missing `objectOntology: 1` — the format version marker.
```

A sample of the summary output is in [the ODD tutorial](../odd/tutorial-requirements-to-ontology.md#7-check-it-with-the-cli).

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | No errors. With `--strict`, no warnings either. |
| 1 | `validate`: there are errors (with `--strict`, errors or warnings). `export`: the file has errors, so nothing was written. |
| 2 | The command could not run: a usage mistake (unknown command, option, format or export kind, missing arguments), a file that cannot be read or written, a file named on the command line that is not an Object Ontology, or no Object Ontology files found in the given paths. |

For exit code 2, `oont` prints the reason and the usage text to standard error:

```text
$ oont validate notes.yaml
oont: notes.yaml is not an Object Ontology file (expected *.oont.yaml|yml|json or a first key objectOntology).

Usage:
  oont validate <path>... [--format text|json] [--strict]
  ...
```

Other messages you may see with exit code 2:

```text
oont: Cannot read missing.oont.yaml: no such file or directory.
oont: No Object Ontology files (*.oont.yaml, *.oont.yml, *.oont.json) found in empty.
oont: Unknown format "xml". Use text or json.
oont: Unknown export "room-booking.oont.yaml". Use tools, summary or turtle.
oont: Unknown command "frobnicate".
```

## Use it in CI

Run `oont validate` on the folders that hold your ontologies. A non-zero exit code fails the job. Add `--strict` when unreferenced requirements and other warnings should block a merge too.

Until the npm package is published, a GitHub Actions job can build the CLI from this repository:

```yaml
name: Ontology
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Build oont
        run: |
          git clone --depth 1 https://github.com/yaggytter/vscode-ontology-driven-development.git "$RUNNER_TEMP/odd"
          cd "$RUNNER_TEMP/odd" && npm ci && npm run build
      - name: Validate ontologies
        run: node "$RUNNER_TEMP/odd/packages/cli/bin/oont.js" validate docs/ontology --strict
```

Replace `docs/ontology` with your own path. To keep exports in sync, regenerate them in CI and fail when they differ:

```sh
oont export tools docs/ontology/room-booking.oont.yaml -o agent/tools.json
git diff --exit-code agent/tools.json
```

For tools that read the results, use `--format json` and read `summary.errors` and `summary.warnings`.

## Use it from an AI agent

The text format is easy for agents to read, and the exit code tells them whether the ontology is valid. A typical instruction in `CLAUDE.md` or a similar file:

```text
After editing any *.oont.yaml file, run `oont validate <file>` and fix every error before continuing.
```

To give an agent the ontology as context, or to serve its actions as tools, use `oont export summary` and `oont export tools`. See [Tutorial 6](../ai/tutorial-6-object-ontology-ai-agents.md) and [Tutorial 8](../ai/tutorial-8-claude-code-object-ontology.md).

## See also

- [Object Ontology Format Reference](object-ontology-format.md)
- [Tutorial: From Requirements to an Ontology](../odd/tutorial-requirements-to-ontology.md)
- [Troubleshooting](troubleshooting.md#cli-oont)
