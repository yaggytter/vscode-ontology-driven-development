# Object Ontology Format Reference

This page describes every part of an Object Ontology file (`*.oont.yaml`) in one place: the sections, the fields each one accepts, requirement IDs, `x-` extension fields, and the diagnostics the tools report. For a guided introduction, start with [Your First Object Ontology](../learn/tutorial-5-object-ontology.md). For the ontology-driven development workflow, see [What Is Ontology-Driven Development?](../odd/what-is-odd.md).

The same rules apply in the VS Code extension and in the [`oont` CLI](cli.md). Both use the same core library.

## Files

| Item | Rule |
| --- | --- |
| File names | `*.oont.yaml`, `*.oont.yml` (YAML) or `*.oont.json` (JSON). Ordinary `.yaml` and `.json` files are not treated as Object Ontologies. |
| Untitled documents | A YAML or JSON document whose first key is `objectOntology` is recognized too. This is how a sample opened with **ODD: Create Sample Ontology...** works before you save it. |
| Version | `objectOntology: 1`. Requirement IDs and `x-` fields are optional additions to version 1, so files written before them still read unchanged. |
| Names | API names (the YAML keys of object types, properties, link types, link sides, interfaces, action types and parameters) match `^[A-Za-z][A-Za-z0-9_]*$`. They cannot contain `-`, so they never collide with `x-` fields. |
| Editing | YAML is the editing format. The diagram writes to YAML files and keeps comments. JSON files are view-only in the diagram. |

## Top-level fields

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `objectOntology` | `1` | Yes | Format version marker. Any other value is an error. |
| `name` | string | No | Name of the ontology. Used in exports. |
| `description` | string | No | What the ontology covers. |
| `namespace` | string | No | IRI used for the RDF projection. Must end in `#`, `/` or `:`. When omitted, the tools use `urn:object-ontology:<slug>#`, where `<slug>` is made from `name`. |
| `requirements` | mapping | No | The requirements registry: requirement ID → title. See [Requirements](#requirements). |
| `objectTypes` | mapping | No | Object types, keyed by API name. |
| `interfaces` | mapping | No | Interfaces, keyed by API name. |
| `linkTypes` | mapping | No | Link types, keyed by API name. |
| `actionTypes` | mapping | No | Action types, keyed by API name. |
| `objects` | mapping | No | Example objects, keyed by object type. |
| `x-*` | any | No | Extension fields. See [`x-` extension fields](#x--extension-fields). |

Unknown fields (other than `x-*`) are reported as warnings, with the list of fields that are allowed at that place. The file still loads.

## Object types

```yaml
objectTypes:
  Room:
    displayName: Meeting room
    description: A bookable meeting room.
    requirements: [REQ-003, REQ-007]
    primaryKey: roomId
    titleProperty: name
    properties:
      roomId: string
      name: string
      capacity: { type: integer, description: Maximum number of attendees. }
      status: { type: string, enum: [active, suspended] }
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `primaryKey` | API name | Yes | The property that identifies an object. Must be one of `properties`. |
| `titleProperty` | API name | No | The property shown as an object's title. Must be one of `properties`. |
| `displayName` | string | No | Human-readable name. Renaming in the diagram writes this field; the API name never changes. |
| `pluralDisplayName` | string | No | Plural form of `displayName`. |
| `description` | string | No | What the type means in the business. |
| `icon` | string | No | A short icon (up to 8 characters, such as an emoji) for the diagram. |
| `color` | string | No | Hex color for the diagram, such as `#3a7bd5`. Anything else is a warning. |
| `implements` | list of API names | No | Interfaces this type implements. The type must have every property the interface declares. |
| `properties` | mapping | No | Properties, keyed by API name. See [Properties](#properties). |
| `requirements` | list of IDs | No | Requirements this type realizes. |
| `x-*` | any | No | Extension fields. |

## Properties

A property is written either as a type name (shorthand) or as a mapping.

```yaml
properties:
  roomId: string                                # shorthand
  tags: string[]                                # shorthand list
  capacity: { type: integer, unit: people }     # mapping
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | string | Yes | `string`, `integer`, `decimal`, `double`, `boolean`, `date`, `timestamp` or `geopoint`. Append `[]` for a list, such as `string[]`. |
| `displayName` | string | No | Human-readable name. |
| `description` | string | No | Meaning of the property. |
| `unit` | string | No | Unit of measure, such as `JPY` or `minutes`. |
| `enum` | list | No | Allowed values. Meaningful on `string` properties only; elsewhere it is a warning. |
| `required` | boolean | No | Whether every object must have a value. |
| `x-*` | any | No | Extension fields (mapping form only). |

## Interfaces

An interface is a shared set of properties that several object types implement.

```yaml
interfaces:
  Trackable:
    displayName: Trackable
    properties:
      lastSeenAt: timestamp
objectTypes:
  Vehicle:
    implements: [Trackable]
    # ... Vehicle must also declare lastSeenAt
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `displayName` | string | No | Human-readable name. |
| `description` | string | No | Meaning of the interface. |
| `extends` | list of API names | No | Interfaces this interface extends. |
| `properties` | mapping | No | Properties, written as for object types. |
| `requirements` | list of IDs | No | Requirements this interface realizes. |
| `x-*` | any | No | Extension fields. |

An interface and an object type cannot share a name.

## Link types

A link type is a named relationship with two sides.

```yaml
linkTypes:
  bookingRoom:
    displayName: Booked room
    from: { objectType: Booking, name: room, cardinality: one }
    to: { objectType: Room, name: bookings, cardinality: many }
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `from` | side | Yes | The side the link starts from. |
| `to` | side | Yes | The other side. |
| `displayName` | string | No | Human-readable name. |
| `description` | string | No | Meaning of the link. |
| `foreignKey` | `Type.property` | No | The property that stores the link, on one of the two object types, such as `Shipment.vehicleId`. |
| `requirements` | list of IDs | No | Requirements this link realizes. |
| `x-*` | any | No | Extension fields. |

Each side (`from` and `to`) has these fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `objectType` | API name | Yes | The object type on this side. |
| `name` | API name | Yes | What the link is called from this side's object type. It must not clash with a property or another link name on that type. |
| `cardinality` | `one` or `many` | No | How many objects this side holds. Defaults to `many`. |
| `displayName` | string | No | Human-readable name of this side. |
| `x-*` | any | No | Extension fields. |

In the example, each Booking has exactly one `room`, and each Room has many `bookings`. The diagram shows this as an **N:1** badge.

## Action types

An action type is a named, parameterized change. Actions are the only declared way to change data, and they become tool definitions for AI agents.

```yaml
actionTypes:
  cancelBooking:
    displayName: Cancel booking
    description: The organizer cancels a booking before it starts.
    requirements: [REQ-004]
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
      requestedBy: { type: objectRef, objectType: Member, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: cancelled } }
    validations:
      - description: Only the organizer can cancel.
        requirements: [REQ-004]
        expr: "booking.organizer == requestedBy"
    sideEffects:
      - Notify the attendees.
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `displayName` | string | No | Human-readable name. |
| `description` | string | No | What the action does, and when not to use it. AI agents read it. |
| `parameters` | mapping | No | Inputs, keyed by API name. |
| `rules` | list | No | The changes the action makes. |
| `validations` | list | No | Conditions that must hold, or the action is rejected. |
| `sideEffects` | list of strings | No | Effects outside the ontology, such as notifications. |
| `requirements` | list of IDs | No | Requirements this action realizes. |
| `x-*` | any | No | Extension fields. |

### Parameters

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | string | Yes | A property type (`string`, `integer`, ...) or `objectRef`. Append `[]` for a list. |
| `objectType` | API name | For `objectRef` | The object type an `objectRef` points to. In exported tools, the agent passes that type's primary key. |
| `required` | boolean | No | Whether the parameter must be given. |
| `displayName` | string | No | Human-readable name. |
| `description` | string | No | Meaning of the parameter. |
| `enum` | list | No | Allowed values. |
| `x-*` | any | No | Extension fields. |

### Rules

| Field | Used by | Meaning |
| --- | --- | --- |
| `op` | all | `createObject`, `modifyObject`, `deleteObject`, `createLink` or `deleteLink`. |
| `objectType` | object ops | The object type created, modified or deleted. |
| `object` | `modifyObject`, `deleteObject` | The parameter that identifies the object. |
| `linkType` | link ops | The link type created or deleted. |
| `from`, `to` | link ops | The parameters that identify the two ends. |
| `set` | `createObject`, `modifyObject` | `property: value`. A value that starts with `$` is a parameter, such as `$startsAt`. Other values are literals. |
| `x-*` | all | Extension fields. |

The tools check that rules refer to existing parameters, object types, link types and properties.

### Validations

A validation is written as a string or as a mapping.

```yaml
validations:
  - Only an active room can be booked.                  # string form
  - description: Attendees must not exceed the capacity. # mapping form
    requirements: [REQ-003]
    expr: "attendees <= room.capacity"
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `description` | string | Yes | The rule in plain language. This is what agents and reviewers read. |
| `expr` | string | No | The same rule as an expression. It is documentation for people and AI agents; the tools do **not** evaluate it. |
| `requirements` | list of IDs | No | Requirements this validation realizes. Counted on its own, not inherited from the action. |
| `x-*` | any | No | Extension fields. |

The string form cannot carry `requirements` or `x-` fields. Use the mapping form when you need them.

## Example objects

`objects:` holds a few example objects per object type. They feed the diagram, SPARQL and the LLM context summary. They are not live data.

```yaml
objects:
  Room:
    - { roomId: R-A, name: Room A, capacity: 4, status: active }
  Booking:
    - { bookingId: B-1003, attendees: 5, status: reserved, room: R-A, organizer: U-02 }
```

- Keys are property API names and link side names. A link field holds the other object's primary key, or a list of them.
- Each object needs its primary key, and keys must be unique within a type.
- `x-` fields are not allowed in example objects.

## Requirements

Requirement IDs let you trace every element back to the requirement it realizes. There are two parts: a **registry** at the top level, and **references** on elements.

### The registry

```yaml
requirements:
  REQ-001: { title: Members can book a room for a time range, source: docs/requirements.md }
  REQ-002: No overlapping bookings for the same room   # shorthand: the string is the title
```

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | string | Yes | A short heading. Keep the full text in your requirements document. |
| `description` | string | No | A note. |
| `source` | string | No | Where the full requirement lives: a URL or a path relative to the ontology file. |
| `x-*` | any | No | Extension fields. |

- A string value means `{ title: <string> }`.
- IDs match `^[A-Za-z][A-Za-z0-9_.-]*$` and are at most 64 characters. Unlike API names, they may contain `-` and `.`, so `REQ-001` and `US-12.3` both work.
- The order of the registry has no meaning, but outputs such as the LLM summary keep the written order.
- An empty registry (`requirements: {}`) still counts as a registry: every reference is then undefined.

### References

Write `requirements: [ID, ...]` on any of these:

| Where | Example |
| --- | --- |
| `objectTypes.<type>` | `Room: { requirements: [REQ-003, REQ-007], ... }` |
| `interfaces.<name>` | |
| `linkTypes.<name>` | |
| `actionTypes.<name>` | `reserveRoom: { requirements: [REQ-001, REQ-002], ... }` |
| `actionTypes.<name>.validations[]` (mapping form) | `- { description: ..., requirements: [REQ-002] }` |

A reference means "this element realizes this requirement, or part of it". References are not allowed on properties, parameters, rules or link sides.

### Where requirements show up

| Place | What you see |
| --- | --- |
| Problems panel / `oont validate` | The diagnostics below. |
| Inspector | A **Requirements** section with `ID title` lines for the selected object type or link. |
| Actions panel | A **Requirements** section for each action. Validations show their own IDs in brackets. |
| SPARQL | Example query **9. Requirements and the elements that realize them**. In the RDF projection, each requirement is an `oont:Requirement` and elements point to it with `oont:satisfies`. |
| LLM context summary | A `Requirements:` line under each element, and a `## Requirements` section listing which elements realize each requirement. |
| Agent tool definitions | Unchanged. Requirement IDs are not written into tools. |

## Requirement diagnostics

These diagnostics carry a code. The CLI prints it in brackets, and the JSON output has it in `code`. Messages are in English in both the extension and the CLI.

| Code | Severity | When | Example message |
| --- | --- | --- | --- |
| `requirement-undefined` | error | A registry exists and a reference uses an ID that is not in it. | `Requirement "REQ-010" is not defined in requirements.` |
| `requirement-registry-missing` | warning | Elements have references, but there is no registry. Reported once, at the first reference. | `Requirement IDs are not checked because there is no top-level requirements registry.` |
| `requirement-unreferenced` | warning | A registry entry is not referenced by any element. | `Requirement "REQ-008" is not referenced by any element.` |
| `requirement-duplicate-reference` | warning | The same ID appears twice in one reference list. Only one is kept. | `Requirement "REQ-001" is listed more than once.` |
| `requirement-id-invalid` | error | An ID does not match the ID rule. No `requirement-undefined` is added for the same ID. | `Invalid requirement ID "REQ 2". Use letters, digits, "_", "-" or ".", starting with a letter.` |
| `requirement-title-missing` | error | A registry entry in mapping form has no `title`. | `Requirement "REQ-001" needs a title.` |

Other diagnostics, such as broken references, unknown fields and duplicate example keys, have no code.

## `x-` extension fields

A key that starts with `x-` is an extension field. Tools that do not know it ignore it, so you can record notes for later phases or for your own tools without breaking anything.

```yaml
Booking:
  x-retention: keep cancelled and released bookings for 1 year
releaseNoShow:
  x-trigger: { kind: schedule, every: 1m }
```

- Keys match `^x-[A-Za-z0-9][A-Za-z0-9_.-]*$`. Values can be any YAML value: a scalar, a list or a mapping.
- Allowed in every mapping with fixed fields: the top level, object types, interfaces, link types, link sides (`from` / `to`), properties (mapping form), action types, parameters, rules, validations (mapping form) and registry entries (mapping form).
- Not allowed as names inside `objectTypes:`, `properties:` and other mappings that list names, and not allowed in `objects:`.
- They raise no diagnostics, are kept when you edit from the diagram, and are not written to the summary, the tool definitions or the RDF projection.
- When an `x-` field proves useful, propose it as a regular field.

## JSON Schema

The full shape is defined by the JSON Schema in [`packages/core/schemas/object-ontology.schema.json`](../../../packages/core/schemas/object-ontology.schema.json). The extension applies it to `*.oont.json` automatically, and to `*.oont.yaml` when the Red Hat YAML extension is installed, which gives you completion as you type. The schema allows `requirements` and `x-` fields; an editor still using an older copy of the schema reports them as errors.
