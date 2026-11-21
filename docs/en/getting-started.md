# Getting Started

This guide takes you from installing the extension to an ontology whose elements are traced to requirements and checked by the `oont` CLI. For the idea behind it, see [What Is Ontology-Driven Development?](odd/what-is-odd.md).

## Install

Install **Ontology-Driven Development** from the VS Code Marketplace (or a `.vsix` file, if you were given one directly).

## Step 1: Open the Meeting Room Booking sample

Run **ODD: Create Sample Ontology...** from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and pick **Meeting Room Booking (Object Ontology)**.

The sample opens as an untitled YAML document. It is a small meeting room booking system written as an Object Ontology. Its top-level `requirements:` registry lists seven requirements (`REQ-001` to `REQ-007`), and every object type, link and action names the requirements it realizes. The requirement titles are written in Japanese; the rest of the file is in English.

```yaml
requirements:
  REQ-001: { title: 会議室を時間指定で予約できる, source: docs/requirements.md }
  REQ-002: 同じ会議室で時間帯が重なる予約はできない
  # ...
objectTypes:
  Room:
    displayName: Meeting room
    requirements: [REQ-003, REQ-007]
```

Save it as `room-booking.oont.yaml` in a folder of your choice. The `.oont.yaml` suffix is what makes the extension and the CLI treat the file as an Object Ontology.

## Step 2: See the requirements in the diagram

With the file focused, press `Cmd+Alt+O` on macOS or `Ctrl+Alt+O` on Windows/Linux. You can also click the diagram icon in the editor's title bar, or run **ODD: Open Diagram Preview**.

- Click **Meeting room** or **Booking**. The Inspector on the right shows the properties, the links and a **Requirements** section with each requirement's ID and title. (Member realizes no requirement, so it has no such section.)
- Click **Actions** in the toolbar and select **Reserve room**. The panel shows its parameters, effects and the conditions under **Rejected unless**, each with the requirement ID it enforces, followed by a **Requirements** section.
- Click **SPARQL**, choose **9. Requirements and the elements that realize them** from **Examples:**, and run it to list every requirement with the elements that realize it.

## Step 3: Let the Problems panel find a gap

Open the Problems panel (`Cmd+Shift+M` / `Ctrl+Shift+M`). The sample is clean, so it is empty.

Now add a requirement that nothing realizes yet. Below `REQ-007` in the registry, add this line:

```yaml
  REQ-008: Export bookings as CSV
```

A warning appears on `REQ-008`: `Requirement "REQ-008" is not referenced by any element.` Every requirement in the registry should be realized by at least one object type, link, action or validation. Misspelled references, such as `REQ-08` in an element's `requirements:` list, are reported as errors. The [format reference](reference/object-ontology-format.md#requirement-diagnostics) lists all requirement diagnostics.

Save the file and keep the new line for the next step.

## Step 4: Validate with the CLI

The same checks run in a terminal, in CI, or from an AI agent, with the `oont` CLI. It will be published to npm as `@yaggytter/object-ontology-cli`. Until then, run it from a clone of this repository (Node.js 20 or later):

```sh
git clone https://github.com/yaggytter/vscode-ontology-driven-development.git
cd vscode-ontology-driven-development
npm ci && npm run build
alias oont="node $PWD/packages/cli/bin/oont.js"
```

Then, in the folder where you saved the sample:

```text
$ oont validate room-booking.oont.yaml
room-booking.oont.yaml:16:3: warning: Requirement "REQ-008" is not referenced by any element. [requirement-unreferenced]
1 file checked: 0 errors, 1 warning
```

The exit code is 0, because warnings alone do not fail. Add `--strict` to fail on warnings too (exit code 1). Remove the `REQ-008` line and the file is clean again:

```text
$ oont validate room-booking.oont.yaml
1 file checked: 0 errors, 0 warnings
```

`oont export summary room-booking.oont.yaml` prints the Markdown summary you can give an AI agent as context. See the [CLI reference](reference/cli.md) for all commands and options.

## Next: build one yourself

[Tutorial: From Requirements to an Ontology](odd/tutorial-requirements-to-ontology.md) builds this ontology step by step, starting from the requirements.

## More samples

**ODD: Create Sample Ontology...** offers more samples, for both styles of ontology:

| Sample | What it shows |
| --- | --- |
| Meeting Room Booking (Object Ontology) | Requirement IDs traced to every element, and `x-` extension fields. |
| Corner Cafe Orders (Object Ontology) | The starter Object Ontology: object types, links, and actions. |
| Delivery Operations (Object Ontology) | Actions as AI-agent tools for handling a delayed shipment. |
| Plant Maintenance (Object Ontology) | Following links from a sensor alert to a work order. |
| Support Desk (Object Ontology) | Validations as guard rails for refunds issued by an agent. |
| Neighborhood Garden | A small class hierarchy, inverse relations, and instances. |
| Tool Lending Circle | Inverse, symmetric, transitive, and functional properties. |
| Field Research Notes | Catalog records and typed literals. |
| Community Services | A concept scheme built with SKOS instead of OWL classes. |
| Harbor Market | Icons, colors, cardinality, and relationship attributes. |
| City Mobility Hub | A medium operational ontology spanning several domains. |
| Community Event (RDF/XML) | An original view-only sample and the "Convert to Turtle" workflow. |
| Bicycle Parts Compatibility | OWL facts an LLM can query instead of guessing (GraphRAG). |
| Logistics Glossary (en/ja) | A bilingual SKOS glossary for search expansion and term normalization. |
| Dataset Catalog with Provenance | DCAT + PROV-O, for answers that cite where a number came from. |
| Research Knowledge Graph | schema.org entities merged across organizations with `sameAs`. |
| Delivery Operations (OWL) | The OWL version of the delivery sample, for comparing the two styles. |

You can also open your own `.ttl` file. Nothing special is required. Object Ontology files need the `.oont.yaml` suffix; see [Your First Object Ontology](learn/tutorial-5-object-ontology.md).

## Try the diagram basics

The diagram opens beside your file in the **schema view** by default: one node per class or object type, one edge per relation, with datatype properties folded into each node rather than drawn separately. For RDF files, the **Schema / Triples** toggle switches to the raw triple graph (every subject, predicate and object as its own node) when you need to see exactly what is in the file.

> **Why not `Cmd+Shift+O`?** That is VS Code's built-in "Go to Symbol in Editor", which is genuinely useful on a large file, so this extension deliberately doesn't take it over.

Open a Turtle sample such as **Neighborhood Garden** and try:

1. **Drag a node.** Its position is remembered the next time you open this file's diagram.
2. **Click a node.** The Inspector opens on the right, showing its name, description, properties, and relations (nodes with a dashed border are editable).
   The Legend explains the color families, and the selected entity shows its connection group.
3. **Edit the name field in the Inspector.** Type a new value and press Enter or click away, and watch the `.ttl` file update. The same panel lets you add a property with the "+ Property" button, or change an existing property's type from its dropdown.
4. **Double-click a node** to enter focus mode. Everything outside that node's neighborhood dims. Click the background to leave focus mode.
5. **Break something on purpose.** Type invalid Turtle in the editor. The diagram keeps showing the last valid graph, and a squiggly line appears at the error.

## Next steps

**Ontology-driven development**

- [What Is Ontology-Driven Development?](odd/what-is-odd.md)
- [Tutorial: From Requirements to an Ontology](odd/tutorial-requirements-to-ontology.md)

**Understand ontologies**

- [Tutorial 1: Build Your First Ontology](learn/tutorial-1-first-ontology.md)
- [Tutorial 2: Edit From the Diagram](learn/tutorial-2-editing-from-diagram.md)
- [Tutorial 3: Bring In an Existing .owl File](learn/tutorial-3-importing-owl.md)
- [Tutorial 4: Ask Questions with SPARQL](learn/tutorial-4-sparql.md)
- [Tutorial 5: Your First Object Ontology](learn/tutorial-5-object-ontology.md)
- [Choosing an Ontology Style](learn/choosing-ontology-style.md) · [Use Cases](learn/use-cases.md)

**Combine with AI**

- [Tutorial 6: Object Ontology × AI Agents](ai/tutorial-6-object-ontology-ai-agents.md)
- [Tutorial 7: Semantic Web Ontologies × LLMs](ai/tutorial-7-semantic-web-llm.md)
- [Tutorial 8: Run It with Claude Code — Object Ontology Agents](ai/tutorial-8-claude-code-object-ontology.md)
- [Tutorial 9: Run It with Claude Code — Semantic Web Answers](ai/tutorial-9-claude-code-semantic-web.md)

**Reference**

- [Object Ontology Format](reference/object-ontology-format.md)
- [CLI (`oont`)](reference/cli.md)
- [Format Support](reference/format-support.md)
- [Troubleshooting](reference/troubleshooting.md)
