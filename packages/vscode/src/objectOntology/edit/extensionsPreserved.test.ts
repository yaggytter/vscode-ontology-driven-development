import { describe, expect, it } from "vitest";
import { parseObjectOntology } from "@yaggytter/object-ontology-core";
import { applySplice } from "./yamlEdit";
import {
  planAddLinkType,
  planAddObjectType,
  planAddProperty,
  planDeleteElement,
  planSetDescription,
  planSetDisplayName,
  planSetPropertyType,
  type EditPlan,
} from "./operations";

/**
 * P1 acceptance criterion A4: diagram edits must not drop or reorder `x-`
 * extension fields (P1 spec 5.2).
 */
const NS = "urn:object-ontology:rooms#";

const DOC = `objectOntology: 1
name: Rooms
namespace: ${NS}
x-owner: facilities
objectTypes:
  Room:
    x-retention: { years: 1 }
    primaryKey: roomId
    x-source: hr-db
    properties:
      roomId: { type: string, x-format: R-### }
      capacity: integer
  Member:
    primaryKey: memberId
    properties:
      memberId: string
actionTypes:
  book:
    x-trigger: { kind: schedule, every: 1m }
    parameters:
      room: { type: objectRef, objectType: Room }
`;

function apply(text: string, plan: EditPlan): string {
  if (!plan.ok) {
    throw new Error(plan.reason);
  }
  return applySplice(text, plan.splice);
}

function xLines(text: string): string[] {
  return text.split("\n").filter((line) => /^\s*x-|[{,]\s*x-/.test(line));
}

const EDITS: Array<[string, (text: string) => EditPlan]> = [
  ["rename an object type's display name", (t) => planSetDisplayName(t, `${NS}Room`, "Meeting room")],
  ["set a description", (t) => planSetDescription(t, `${NS}Room`, "A bookable room")],
  ["add an object type", (t) => planAddObjectType(t, "Floor", undefined)],
  ["add a property", (t) => planAddProperty(t, `${NS}Room`, "floor", "string")],
  ["change a property type", (t) => planSetPropertyType(t, `${NS}Room.capacity`, "decimal")],
  ["add a link type", (t) => planAddLinkType(t, `${NS}Room`, `${NS}Member`, "roomMember")],
  ["delete a property next to x- fields", (t) => planDeleteElement(t, `${NS}Room.capacity`)],
];

describe("diagram edits keep x- fields (A4)", () => {
  const before = parseObjectOntology(DOC).ontology!;

  for (const [name, plan] of EDITS) {
    it(name, () => {
      const after = apply(DOC, plan(DOC));
      expect(xLines(after)).toEqual(xLines(DOC));
      const ontology = parseObjectOntology(after).ontology!;
      expect(ontology.extensions).toEqual(before.extensions);
      const room = ontology.objectTypes.find((t) => t.apiName === "Room")!;
      expect(room.extensions).toEqual({ "x-retention": { years: 1 }, "x-source": "hr-db" });
      expect(room.properties.find((p) => p.apiName === "roomId")?.extensions).toEqual({ "x-format": "R-###" });
      expect(ontology.actionTypes[0].extensions).toEqual(before.actionTypes[0].extensions);
    });
  }
});
