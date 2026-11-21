// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { parseObjectOntology } from "@yaggytter/object-ontology-core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderEntitySelection, renderRelationSelection } from "./inspector";
import { renderActionDetails } from "./actions";
import { objectOntologyToSchemaModel } from "../../src/objectOntology/toSchemaModel";
import { buildActionViews } from "../../src/objectOntology/actionView";
import type { UiStrings } from "../../src/shared/messages";

/** P1 spec 4.7: the Inspector (and the Actions panel) list an element's requirements. */
const strings = new Proxy({ requirementsLabel: "Requirements" } as Partial<UiStrings>, {
  get: (target, prop) => (target as Record<string, string>)[prop as string] ?? String(prop),
}) as UiStrings;

const callbacks = new Proxy({}, { get: () => vi.fn() }) as never;
const text = readFileSync(join(__dirname, "..", "..", "samples", "room-booking.oont.yaml"), "utf8");
const ontology = parseObjectOntology(text).ontology!;
const schema = objectOntologyToSchemaModel(ontology);

describe("requirements in the Inspector", () => {
  it("lists ID and title for an object type", () => {
    const room = schema.entities.find((e) => e.id.endsWith("#Room"))!;
    const container = document.createElement("div");
    renderEntitySelection(container, strings, schema, room, callbacks, true);
    const items = Array.from(container.querySelectorAll(".inspector-requirements li")).map((li) => li.textContent);
    expect(items).toEqual(["REQ-003 参加人数が定員を超える予約はできない", "REQ-007 総務は会議室を利用停止にできる"]);
    expect(container.textContent).toContain("Requirements");
  });

  it("lists requirements for a link type", () => {
    const small = parseObjectOntology(`objectOntology: 1
name: Links
requirements:
  REQ-004: Rooms have an owner
objectTypes:
  Room:
    primaryKey: id
    properties:
      id: string
linkTypes:
  roomOwner:
    requirements: [REQ-004]
    from: { objectType: Room, name: owner, cardinality: one }
    to: { objectType: Room, name: owned }
`).ontology!;
    const smallSchema = objectOntologyToSchemaModel(small);
    const link = smallSchema.relations.find((r) => r.kind === "linkType")!;
    const container = document.createElement("div");
    renderRelationSelection(container, strings, smallSchema, link, callbacks);
    expect(Array.from(container.querySelectorAll(".inspector-requirements li")).map((li) => li.textContent)).toEqual(["REQ-004 Rooms have an owner"]);
  });

  it("shows nothing for elements without requirements", () => {
    const cafe = parseObjectOntology(readFileSync(join(__dirname, "..", "..", "samples", "cafe-orders.oont.yaml"), "utf8")).ontology!;
    const cafeSchema = objectOntologyToSchemaModel(cafe);
    const container = document.createElement("div");
    renderEntitySelection(container, strings, cafeSchema, cafeSchema.entities[0], callbacks, true);
    expect(container.querySelector(".inspector-requirements")).toBeNull();
    expect(cafeSchema.entities.every((e) => e.requirements === undefined)).toBe(true);
  });

  it("lists an action's requirements and marks validations with theirs", () => {
    const reserve = buildActionViews(ontology).find((a) => a.apiName === "reserveRoom")!;
    const details = renderActionDetails(reserve, strings);
    expect(details.textContent).toContain("Requirements");
    expect(reserve.requirements).toEqual([
      "REQ-001 会議室を時間指定で予約できる",
      "REQ-002 同じ会議室で時間帯が重なる予約はできない",
      "REQ-003 参加人数が定員を超える予約はできない",
      "REQ-007 総務は会議室を利用停止にできる",
    ]);
    expect(reserve.validations.some((v) => /\[REQ-\d{3}(, REQ-\d{3})*\]$/.test(v))).toBe(true);
  });
});
