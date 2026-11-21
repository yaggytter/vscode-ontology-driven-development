# What Is Ontology-Driven Development?

**Ontology-driven development (ODD)** is a way of building software in which you write an ontology after the requirements and before the design, and then keep that ontology as the source of truth until the end of the project.

Here, an ontology is a machine-readable description of two things:

- **What exists** in the business: the things, their properties, and how they relate.
- **How it may change**: the operations, the conditions they need, and their side effects.

You write it as an [Object Ontology](../reference/object-ontology-format.md) file (`*.oont.yaml`). This extension and the `oont` CLI help you create, review, check and use it.

## Why write an ontology before the design?

Requirements are written in sentences. Designs are written in tables, classes and APIs. Between the two, many questions get answered silently, often by whoever writes the first table:

- Is a "reservation" the same thing as a "booking"? Is "using a room" a separate thing?
- When a booking is cancelled, is it deleted, or does its status change?
- Can one booking hold several rooms?
- Who may cancel, and until when?

An ontology makes you answer these questions on purpose, in one small file that business people, developers and AI agents can all read. Because it is written before the design, the answers come from the business, not from a database schema. Because it is machine-readable, tools can check it and later steps can be generated from it or checked against it.

## How it differs from other approaches

| | Classic ontology-driven engineering (OWL/RDF) | Domain-driven design | Ontology-driven development |
| --- | --- | --- | --- |
| Main concern | Formal knowledge and reasoning | A model per bounded context | One source of truth for concepts and operations across contexts |
| Notation | OWL, RDF | Code, diagrams, ubiquitous language | Lightweight YAML (Object Ontology) |
| Operations | Not modeled | Designed as aggregates and domain services | Written as action types before the design |
| AI agents | Not considered | Not considered | The ontology is the agent's context and the source of its tools |

ODD does not replace domain-driven design. Settle the concepts and operations in the ontology first, then use DDD to design bounded contexts and aggregates.

## The process

```text
Requirements → Ontology → Review → Design → Implementation → Verification
                  ↑                                             │
                  └──── requirement changes, unclear concepts ──┘
```

| Step | What you do | What you get | How this extension helps |
| --- | --- | --- | --- |
| Requirements | Give every requirement an ID and list them. | A requirements list (`REQ-001`, ...) | Write it in Markdown next to the ontology. |
| Ontology | Extract object types, link types and action types from the requirements. Tag each element with the requirement IDs it realizes. | `*.oont.yaml` | Diagnostics in the Problems panel as you type, `oont validate`, completion from the JSON Schema. |
| Review | Walk through the diagram with business people and agree on the concepts and operations. Record the questions you asked and the answers. | A reviewed ontology and a record of decisions | The diagram, the Inspector's **Requirements** section, and the **Actions** panel. |
| Design | Map the ontology onto modules, databases and APIs. Decide context boundaries. | Design documents | SPARQL for dependency analysis and for listing the elements behind each requirement. |
| Implementation | Implement from the ontology. Give AI agents the ontology as context. | Code and tests | `oont export summary` and `oont export tools` (the same output as the extension's exports). |
| Verification | Check that the implementation matches the ontology, for example that every action type has a test. | Test results | Manual for now. |

When a requirement changes, change the ontology before the code. The diff of the ontology then explains the scope of the change. SPARQL can answer impact questions such as "which actions modify Booking?".

## From requirements to an ontology

Read the requirements and pull out the following, in this order:

| In the requirements | In the Object Ontology | Meeting room example |
| --- | --- | --- |
| Things the business handles (nouns) | `objectTypes` | Meeting room, booking, member |
| Properties of those things | `properties` | Capacity, start time, status |
| Relationships between things | `linkTypes`, with cardinality | A booking holds one room |
| Operations (verbs, use cases) | `actionTypes`, `parameters`, `rules` | Reserve, cancel, check in |
| Business rules and constraints | `validations` | No overlapping bookings |
| Notifications and other effects | `sideEffects` | Notify the organizer when a booking is released |
| Concrete examples | `objects` | Room A, capacity 4 |

While you extract, ask these questions. Take the ones you cannot answer to the business.

- **Identity**: What makes two things the same? What is the primary key? Are two similar words the same thing or different things?
- **Lifecycle**: Does a thing disappear, or does only its status change? Which statuses are there?
- **Cardinality**: Is the relationship one-to-one, one-to-many or many-to-many?
- **Permissions and conditions**: Who may perform the operation, and in what state?
- **Exceptions**: When would someone want to break the rule?

The [hands-on tutorial](tutorial-requirements-to-ontology.md) goes through these steps with a meeting room booking system.

## Principles

1. **Concepts first, implementation later.** Do not let tables or classes decide the concepts. Decide "same or different?" and "deleted or changed?" before the design.
2. **Write operations, not only things.** Write down what can be changed, when, by whom and under which conditions, as action types. Most use cases and business rules end up here.
3. **Keep the ontology with the code (ontology as code).** Change it through pull requests and review the diffs.
4. **Start small and grow it.** Do not try to cover everything at once. Move on to the design before the ontology is complete, and bring unclear concepts found later back into the ontology.
5. **Let the ontology drive what comes after.** Types, schemas, APIs, tests and agent tools are generated from the ontology or checked against it. When they disagree, the ontology wins.
6. **People and AI read the same ontology.** Agreements with the business and instructions to AI agents are based on the same file.
7. **Keep the link to requirements.** Record on each element which requirements it comes from.

## How the tools support each step

| You want to | Use |
| --- | --- |
| Start from a complete example | **ODD: Create Sample Ontology...** → **Meeting Room Booking (Object Ontology)** |
| See mistakes while you write | The Problems panel: broken references, unknown fields, and the [requirement diagnostics](../reference/object-ontology-format.md#requirement-diagnostics) |
| Review with the business | The diagram (`Cmd+Alt+O` / `Ctrl+Alt+O`), the Inspector's **Requirements** section, the **Actions** panel |
| Trace requirements | SPARQL example **9. Requirements and the elements that realize them**, or the `## Requirements` section of the LLM summary |
| Check in CI or from an agent | [`oont validate`](../reference/cli.md) |
| Hand the ontology to an AI agent | `oont export summary` / `oont export tools`, or the matching **ODD: Export ...** commands ([Tutorial 6](../ai/tutorial-6-object-ontology-ai-agents.md)) |
| Connect to glossaries and external knowledge | The Semantic Web side of the extension: OWL, RDF and SKOS files, and the Turtle export of an Object Ontology ([Choosing an Ontology Style](../learn/choosing-ontology-style.md)) |

## Current limits

- The `expr` of a validation is documentation for people and AI agents. The tools do not evaluate it. Write expressions in a consistent style so that they can be used for test generation later.
- Verification (does the code match the ontology?) is manual for now.
- There is no dedicated place yet for read-only queries such as "list" or "search". Keep them in the requirements list if you need them.

## Next steps

- [Tutorial: From Requirements to an Ontology](tutorial-requirements-to-ontology.md)
- [Object Ontology Format Reference](../reference/object-ontology-format.md)
- [CLI Reference](../reference/cli.md)
