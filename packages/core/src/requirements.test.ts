import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseObjectOntology } from "./parse";
import { requirementCoverage } from "./model";
import { buildContextSummary } from "./export/contextSummary";
import { objectOntologyToTurtle } from "./export/turtle";

/** P1 spec 4 (F1): requirements registry, references and their diagnostics. */
const HEAD = "objectOntology: 1\nname: Rooms\nnamespace: urn:test:rooms#\n";

const BODY = `objectTypes:
  Room:
    requirements: [REQ-003]
    primaryKey: roomId
    properties:
      roomId: string
interfaces:
  Bookable:
    requirements: [REQ-003]
    properties:
      name: string
linkTypes:
  roomOwner:
    requirements: [REQ-004]
    from: { objectType: Room, name: owner, cardinality: one }
    to: { objectType: Room, name: owned }
actionTypes:
  reserve:
    requirements: [REQ-001]
    parameters:
      room: { type: objectRef, objectType: Room }
    validations:
      - { description: No overlap, requirements: [REQ-002] }
      - Plain string validation
`;

const REGISTRY = `requirements:
  REQ-001: { title: Book a room, source: docs/requirements.md, x-priority: high }
  REQ-002: No overlapping bookings
  REQ-003:
    title: Rooms have a capacity
    description: Seats only.
  REQ-004: Rooms have an owner
`;

function parse(text: string) {
  return parseObjectOntology(text);
}

function codes(text: string): Array<[string | undefined, string, string]> {
  const parsed = parse(text);
  return parsed.diagnostics
    .filter((d) => d.code?.startsWith("requirement-"))
    .map((d) => [d.code, d.severity, text.slice(d.range.start, d.range.end)]);
}

describe("requirements registry and references (F1)", () => {
  it("reads a clean registry and references without diagnostics", () => {
    const parsed = parse(HEAD + REGISTRY + BODY);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("models the registry in written order, with the string shorthand as title", () => {
    const ontology = parse(HEAD + REGISTRY + BODY).ontology!;
    expect(ontology.requirements.map((r) => r.id)).toEqual(["REQ-001", "REQ-002", "REQ-003", "REQ-004"]);
    expect(ontology.requirements[0]).toEqual({
      id: "REQ-001",
      title: "Book a room",
      source: "docs/requirements.md",
      extensions: { "x-priority": "high" },
    });
    expect(ontology.requirements[1]).toEqual({ id: "REQ-002", title: "No overlapping bookings" });
    expect(ontology.requirements[2]).toMatchObject({ id: "REQ-003", title: "Rooms have a capacity", description: "Seats only." });
  });

  it("models references on every element kind, empty when absent", () => {
    const ontology = parse(HEAD + REGISTRY + BODY).ontology!;
    expect(ontology.objectTypes[0].requirements).toEqual(["REQ-003"]);
    expect(ontology.interfaces[0].requirements).toEqual(["REQ-003"]);
    expect(ontology.linkTypes[0].requirements).toEqual(["REQ-004"]);
    expect(ontology.actionTypes[0].requirements).toEqual(["REQ-001"]);
    expect(ontology.actionTypes[0].validations[0].requirements).toEqual(["REQ-002"]);
    expect(ontology.actionTypes[0].validations[1].requirements).toEqual([]);
    const plain = parse(HEAD + "objectTypes:\n  A:\n    primaryKey: id\n    properties:\n      id: string\n").ontology!;
    expect(plain.requirements).toEqual([]);
    expect(plain.objectTypes[0].requirements).toEqual([]);
  });

  it("computes coverage per requirement, not inheriting validation references into the action", () => {
    const coverage = requirementCoverage(parse(HEAD + REGISTRY + BODY).ontology!);
    expect(coverage.map((c) => [c.requirement.id, c.elements])).toEqual([
      ["REQ-001", [{ kind: "actionType", apiName: "reserve" }]],
      ["REQ-002", [{ kind: "validation", apiName: "reserve", validationIndex: 0 }]],
      [
        "REQ-003",
        [
          { kind: "objectType", apiName: "Room" },
          { kind: "interface", apiName: "Bookable" },
        ],
      ],
      ["REQ-004", [{ kind: "linkType", apiName: "roomOwner" }]],
    ]);
  });
});

describe("requirement diagnostics (P1 spec 4.3, A3)", () => {
  it("requirement-undefined: reported at the unknown ID, only when a registry exists", () => {
    const text = HEAD + REGISTRY + BODY.replace("requirements: [REQ-004]", "requirements: [REQ-004, REQ-010]");
    expect(codes(text)).toEqual([["requirement-undefined", "error", "REQ-010"]]);
    expect(parse(text).diagnostics.find((d) => d.code === "requirement-undefined")?.message).toBe(
      'Requirement "REQ-010" is not defined in requirements.',
    );
    expect(codes(HEAD + REGISTRY + BODY)).toEqual([]);
  });

  it("requirement-registry-missing: one warning at the first reference when there is no registry", () => {
    const text = HEAD + BODY;
    expect(codes(text)).toEqual([["requirement-registry-missing", "warning", "REQ-003"]]);
    expect(parse(text).diagnostics[0].range.start).toBe(text.indexOf("REQ-003"));
    expect(codes(HEAD + "objectTypes:\n  A:\n    primaryKey: id\n    properties:\n      id: string\n")).toEqual([]);
  });

  it("an empty registry still counts as a registry", () => {
    const text = HEAD + "requirements: {}\n" + BODY;
    expect(codes(text).map((c) => c[0])).toEqual([
      "requirement-undefined",
      "requirement-undefined",
      "requirement-undefined",
      "requirement-undefined",
      "requirement-undefined",
    ]);
  });

  it("requirement-unreferenced: warning at the registry key nobody references", () => {
    const text = HEAD + REGISTRY + "  REQ-008: Nobody uses this\n" + BODY;
    expect(codes(text)).toEqual([["requirement-unreferenced", "warning", "REQ-008"]]);
    expect(codes(HEAD + REGISTRY + BODY)).toEqual([]);
  });

  it("requirement-duplicate-reference: warning at the second and later occurrences; the model keeps one", () => {
    const text = HEAD + REGISTRY + BODY.replace("requirements: [REQ-001]", "requirements: [REQ-001, REQ-001, REQ-001]");
    const parsed = parse(text);
    const dupes = parsed.diagnostics.filter((d) => d.code === "requirement-duplicate-reference");
    expect(dupes.map((d) => [d.severity, d.range.start])).toEqual([
      ["warning", text.indexOf("REQ-001, REQ-001, REQ-001") + "REQ-001, ".length],
      ["warning", text.indexOf("REQ-001, REQ-001, REQ-001") + "REQ-001, REQ-001, ".length],
    ]);
    expect(parsed.ontology!.actionTypes[0].requirements).toEqual(["REQ-001"]);
    expect(codes(HEAD + REGISTRY + BODY)).toEqual([]);
  });

  it("requirement-id-invalid: error in the registry and in references, without a second undefined error", () => {
    const registryText = HEAD + REGISTRY + '  "REQ 9": Bad id\n' + BODY;
    expect(codes(registryText)).toEqual([["requirement-id-invalid", "error", '"REQ 9"']]);
    const refText = HEAD + REGISTRY + BODY.replace("requirements: [REQ-004]", 'requirements: [REQ-004, "9-REQ"]');
    expect(codes(refText)).toEqual([["requirement-id-invalid", "error", '"9-REQ"']]);
    const long = `R${"x".repeat(64)}`;
    expect(codes(HEAD + REGISTRY + `  ${long}: Too long\n` + BODY)).toEqual([["requirement-id-invalid", "error", long]]);
    expect(codes(HEAD + REGISTRY + "  US-12.3_a: Fine\n" + BODY.replace("[REQ-001]", "[REQ-001, US-12.3_a]"))).toEqual([]);
  });

  it("requirement-title-missing: error for an object-form entry without title", () => {
    const text = HEAD + REGISTRY + "  REQ-005: { source: somewhere }\n" + BODY.replace("[REQ-001]", "[REQ-001, REQ-005]");
    expect(codes(text)).toEqual([["requirement-title-missing", "error", "REQ-005"]]);
    expect(parse(text).diagnostics.find((d) => d.code)?.message).toBe('Requirement "REQ-005" needs a title.');
    expect(codes(HEAD + REGISTRY + BODY)).toEqual([]);
  });

  it("does not accept references on properties or on string validations", () => {
    const text = HEAD + REGISTRY + BODY.replace("      roomId: string", "      roomId: { type: string, requirements: [REQ-001] }");
    expect(parse(text).diagnostics.some((d) => d.message.startsWith('Unknown field "requirements" in property'))).toBe(true);
  });
});

describe("requirements in exports (P1 spec 4.5, 4.6, A9)", () => {
  const ontology = parse(HEAD + REGISTRY + BODY).ontology!;

  it("adds a Requirements section and per-element requirement lines to the LLM summary", () => {
    const summary = buildContextSummary(ontology);
    expect(summary).toContain(
      [
        "## Requirements",
        "- REQ-001: Book a room — realized by action reserve",
        "- REQ-002: No overlapping bookings — realized by a validation of action reserve",
        "- REQ-003: Rooms have a capacity — realized by object type Room, interface Bookable",
        "- REQ-004: Rooms have an owner — realized by link roomOwner",
      ].join("\n"),
    );
    expect(summary).toContain("### Room\nRequirements: REQ-003\n");
    expect(summary).toContain("### reserve\nRequirements: REQ-001\n");
    expect(summary).toContain("  - No overlap (requirements: REQ-002)");
    expect(summary).toMatch(/- roomOwner: .* Requirements: REQ-004\.\n/);
  });

  it("leaves the summary of files without requirements unchanged", () => {
    const plain = parse(HEAD + "objectTypes:\n  A:\n    primaryKey: id\n    properties:\n      id: string\n").ontology!;
    expect(buildContextSummary(plain)).not.toContain("Requirement");
  });

  it("projects requirements and oont:satisfies into RDF", async () => {
    const turtle = await objectOntologyToTurtle(ontology);
    expect(turtle).toMatch(/<urn:test:rooms#requirement\/REQ-002> a oont:Requirement;\s+oont:requirementId "REQ-002";\s+rdfs:label "No overlapping bookings"/);
    expect(turtle).toMatch(/<urn:test:rooms#action\/reserve> [^.]*oont:satisfies <urn:test:rooms#requirement\/REQ-001>/s);
    expect(turtle).toMatch(/<urn:test:rooms#action\/reserve\/validation\/1> a oont:Validation;[^.]*oont:satisfies <urn:test:rooms#requirement\/REQ-002>/s);
    expect(turtle).toMatch(/:Room oont:satisfies <urn:test:rooms#requirement\/REQ-003>/);
    expect(turtle).toMatch(/:Bookable oont:satisfies <urn:test:rooms#requirement\/REQ-003>/);
    expect(turtle).toMatch(/<urn:test:rooms#link\/roomOwner> oont:satisfies <urn:test:rooms#requirement\/REQ-004>/);
  });
});

describe("the P1 worked example (A2)", () => {
  it("has no errors and no warnings", () => {
    const text = readFileSync(join(__dirname, "..", "fixtures", "room-booking.p1.oont.yaml"), "utf8");
    expect(parse(text).diagnostics).toEqual([]);
  });
});
