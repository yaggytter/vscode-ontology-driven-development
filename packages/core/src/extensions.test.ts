import { describe, expect, it } from "vitest";
import { parseObjectOntology } from "./parse";

/** P1 spec 5 (F2): `x-` extension fields on every fixed-field mapping. */
const DOC = `objectOntology: 1
name: Extensions
x-owner: platform-team
objectTypes:
  Room:
    primaryKey: id
    x-retention: { years: 1 }
    properties:
      id: string
      capacity: { type: integer, x-unit-source: facilities }
interfaces:
  Bookable:
    x-since: 2026
    properties:
      name: string
linkTypes:
  roomOwner:
    x-note: owner link
    from: { objectType: Room, name: owner, cardinality: one, x-side: from }
    to: { objectType: Room, name: owned, x-side: [to, back] }
actionTypes:
  book:
    x-trigger: { kind: schedule, every: 1m }
    parameters:
      room: { type: objectRef, objectType: Room, x-widget: picker }
    rules:
      - { op: modifyObject, objectType: Room, object: room, set: { capacity: "1" }, x-audit: true }
    validations:
      - { description: Room must be free, x-severity: hard }
      - Plain string validation
`;

describe("x- extension fields (F2)", () => {
  const parsed = parseObjectOntology(DOC);
  const ontology = parsed.ontology!;

  it("does not report x- fields", () => {
    expect(parsed.diagnostics).toEqual([]);
  });

  it("keeps x- values on the top level", () => {
    expect(ontology.extensions).toEqual({ "x-owner": "platform-team" });
  });

  it("keeps x- values on object types, properties, interfaces and link types", () => {
    const room = ontology.objectTypes[0];
    expect(room.extensions).toEqual({ "x-retention": { years: 1 } });
    expect(room.properties.find((p) => p.apiName === "capacity")?.extensions).toEqual({ "x-unit-source": "facilities" });
    expect(room.properties.find((p) => p.apiName === "id")?.extensions).toBeUndefined();
    expect(ontology.interfaces[0].extensions).toEqual({ "x-since": 2026 });
    expect(ontology.linkTypes[0].extensions).toEqual({ "x-note": "owner link" });
    expect(ontology.linkTypes[0].from.extensions).toEqual({ "x-side": "from" });
    expect(ontology.linkTypes[0].to.extensions).toEqual({ "x-side": ["to", "back"] });
  });

  it("keeps x- values on action types, parameters, rules and object-form validations", () => {
    const book = ontology.actionTypes[0];
    expect(book.extensions).toEqual({ "x-trigger": { kind: "schedule", every: "1m" } });
    expect(book.parameters[0].extensions).toEqual({ "x-widget": "picker" });
    expect(book.rules[0].extensions).toEqual({ "x-audit": true });
    expect(book.validations[0].extensions).toEqual({ "x-severity": "hard" });
    expect(book.validations[1].extensions).toBeUndefined();
  });

  it("leaves elements without x- fields without an extensions object", () => {
    const plain = parseObjectOntology("objectOntology: 1\nname: Plain\nobjectTypes:\n  A:\n    primaryKey: id\n    properties:\n      id: string\n");
    expect(plain.ontology?.extensions).toBeUndefined();
    expect(plain.ontology?.objectTypes[0].extensions).toBeUndefined();
  });

  it("still warns about keys that only look like x- fields", () => {
    const parsedBad = parseObjectOntology("objectOntology: 1\nname: Bad\nx-: 1\nx-_a: 2\nX-up: 3\n");
    expect(parsedBad.diagnostics.map((d) => [d.severity, d.message.split(".")[0]])).toEqual([
      ["warning", 'Unknown field "x-" in the document'],
      ["warning", 'Unknown field "x-_a" in the document'],
      ["warning", 'Unknown field "X-up" in the document'],
    ]);
  });

  it("does not let x- names act as element names", () => {
    const parsedName = parseObjectOntology("objectOntology: 1\nname: N\nobjectTypes:\n  x-thing:\n    primaryKey: id\n");
    expect(parsedName.diagnostics.some((d) => d.message.includes('"x-thing" is not a valid API name'))).toBe(true);
  });
});
