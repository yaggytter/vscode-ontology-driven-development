import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { objectOntologyToTurtle, parseObjectOntology } from "@yaggytter/object-ontology-core";
import { parseOntology } from "../rdf/parse";

const cafe = parseObjectOntology(
  readFileSync(join(__dirname, "..", "..", "samples", "cafe-orders.oont.yaml"), "utf8"),
).ontology!;

describe("objectOntologyToTurtle", () => {
  it("writes Turtle that the RDF side of the viewer parses back", async () => {
    const turtle = await objectOntologyToTurtle(cafe);
    const parsed = await parseOntology(turtle, "turtle", "file:///cafe.ttl");
    expect(parsed.errors).toEqual([]);
    expect(parsed.quads.length).toBeGreaterThan(100);
  });
});
