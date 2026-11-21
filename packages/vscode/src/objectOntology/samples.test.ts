import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildAgentTools, objectOntologyToQuads, parseObjectOntology } from "@yaggytter/object-ontology-core";
import { objectOntologyToSchemaModel } from "./toSchemaModel";
import { detectObjectOntology, OBJECT_ONTOLOGY_FILE_PATTERN } from "@yaggytter/object-ontology-core";
import { runSparqlQuery } from "../sparql/engine";

/**
 * Every bundled Object Ontology sample must be a clean, complete teaching
 * example: no diagnostics at all (not even warnings), at least one link and
 * one action, example objects that link up, and a pinned schema snapshot so a
 * change to the projection shows up in review.
 */
const SAMPLES_DIR = join(__dirname, "..", "..", "samples");
const SAMPLES = readdirSync(SAMPLES_DIR)
  .filter((name) => OBJECT_ONTOLOGY_FILE_PATTERN.test(name))
  .sort();

describe("bundled Object Ontology samples", () => {
  it("exist", () => {
    expect(SAMPLES.length).toBeGreaterThanOrEqual(1);
  });

  for (const fileName of SAMPLES) {
    describe(fileName, () => {
      const text = readFileSync(join(SAMPLES_DIR, fileName), "utf8");
      const parsed = parseObjectOntology(text);

      it("is recognized when opened as an untitled document (the sample picker)", () => {
        expect(detectObjectOntology("Untitled-1", "yaml", text)).toBe("yaml");
      });

      it("parses without any diagnostics", () => {
        expect(parsed.diagnostics).toEqual([]);
      });

      it("has links, actions and linked example objects", async () => {
        const ontology = parsed.ontology!;
        expect(ontology.linkTypes.length).toBeGreaterThan(0);
        expect(ontology.actionTypes.length).toBeGreaterThan(0);
        expect(buildAgentTools(ontology).tools.length).toBe(ontology.actionTypes.length);
        const result = await runSparqlQuery(
          objectOntologyToQuads(ontology),
          "PREFIX oont: <urn:object-ontology:vocab#> ASK { ?side a oont:LinkSide . ?a ?side ?b }",
        );
        expect(result).toEqual({ kind: "boolean", value: true });
      });

      it("produces a stable schema model", () => {
        expect(objectOntologyToSchemaModel(parsed.ontology!)).toMatchSnapshot();
      });
    });
  }
});
