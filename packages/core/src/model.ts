/**
 * Domain model for "Object Ontology" documents (`*.oont.yaml` / `*.oont.json`):
 * an object-centric ontology in the style popularized by operational
 * platforms such as Palantir Foundry — object types with typed properties,
 * link types between them, interfaces that object types implement, and
 * action types that describe the changes users (or AI agents) may make.
 *
 * Unlike the RDF side of the extension, identity here is closed-world and
 * key-based: an object type is identified by its API name, an object by its
 * primary-key value. IRIs are minted deterministically from those names (see
 * ./iris.ts) only so the shared diagram/query machinery has stable ids.
 */

export const OBJECT_ONTOLOGY_FORMAT_VERSION = 1;

export const PROPERTY_TYPES = [
  "string",
  "integer",
  "decimal",
  "double",
  "boolean",
  "date",
  "timestamp",
  "geopoint",
] as const;
export type OoPropertyType = (typeof PROPERTY_TYPES)[number];

export type OoParameterType = OoPropertyType | "objectRef";
export const PARAMETER_TYPES: readonly OoParameterType[] = [...PROPERTY_TYPES, "objectRef"];

export const RULE_OPS = ["createObject", "modifyObject", "deleteObject", "createLink", "deleteLink"] as const;
export type OoRuleOp = (typeof RULE_OPS)[number];

export type OoCardinality = "one" | "many";

/** Offsets into the source text, `end` exclusive. */
export interface SourceRange {
  start: number;
  end: number;
}

export interface OoProperty {
  apiName: string;
  type: OoPropertyType;
  isArray: boolean;
  displayName?: string;
  description?: string;
  unit?: string;
  enumValues?: string[];
  required: boolean;
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
}

export interface OoObjectType {
  apiName: string;
  displayName?: string;
  pluralDisplayName?: string;
  description?: string;
  primaryKey: string;
  titleProperty?: string;
  icon?: string;
  color?: string;
  implements: string[];
  properties: OoProperty[];
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
  /** Requirement IDs this element realizes (P1 F1); empty when none are written. */
  requirements: string[];
}

export interface OoInterface {
  apiName: string;
  displayName?: string;
  description?: string;
  extends: string[];
  properties: OoProperty[];
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
  /** Requirement IDs this element realizes (P1 F1); empty when none are written. */
  requirements: string[];
}

export interface OoLinkSide {
  objectType: string;
  /** How this side's object type refers to the *other* side, e.g. `Shipment.vehicle`. */
  name: string;
  displayName?: string;
  /** How many objects of the other side one object of this side links to. */
  cardinality: OoCardinality;
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
}

export interface OoLinkType {
  apiName: string;
  displayName?: string;
  description?: string;
  from: OoLinkSide;
  to: OoLinkSide;
  /** `Type.property` holding the other side's primary key, when the link is foreign-key backed. */
  foreignKey?: { objectType: string; property: string };
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
  /** Requirement IDs this element realizes (P1 F1); empty when none are written. */
  requirements: string[];
}

export interface OoParameter {
  id: string;
  type: OoParameterType;
  isArray: boolean;
  objectType?: string;
  required: boolean;
  displayName?: string;
  description?: string;
  enumValues?: string[];
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
}

export interface OoRule {
  op: OoRuleOp;
  objectType?: string;
  linkType?: string;
  /** Parameter id naming the object a modify/delete rule acts on. */
  object?: string;
  /** Parameter ids naming the two ends of a createLink/deleteLink rule. */
  from?: string;
  to?: string;
  /** Property API name -> value expression (`$param` or a literal), kept as text. */
  set: Record<string, string>;
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
}

export interface OoValidation {
  description: string;
  expr?: string;
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
  /** Requirement IDs this element realizes (P1 F1); empty when none are written. */
  requirements: string[];
}

export interface OoActionType {
  apiName: string;
  displayName?: string;
  description?: string;
  parameters: OoParameter[];
  rules: OoRule[];
  validations: OoValidation[];
  sideEffects: string[];
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
  /** Requirement IDs this element realizes (P1 F1); empty when none are written. */
  requirements: string[];
}

export interface OoObjectRecord {
  objectType: string;
  /** Raw field values keyed by property API name or link-side name. */
  values: ReadonlyMap<string, unknown>;
}

/** An entry of the top-level requirements registry (P1 F1). */
export interface OoRequirement {
  id: string;
  title: string;
  description?: string;
  /** Where the requirement text lives: a URL or a path relative to the ontology file. */
  source?: string;
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
}

export interface ObjectOntology {
  version: number;
  name: string;
  description?: string;
  namespace: string;
  objectTypes: OoObjectType[];
  interfaces: OoInterface[];
  linkTypes: OoLinkType[];
  actionTypes: OoActionType[];
  objects: OoObjectRecord[];
  /** The requirements registry in written order; empty when the file has none. */
  requirements: OoRequirement[];
  /** `x-` extension fields (P1 F2), keyed as written. Absent when there are none. */
  extensions?: Record<string, unknown>;
}

export type OoSeverity = "error" | "warning";

export interface OoDiagnostic {
  message: string;
  severity: OoSeverity;
  range: SourceRange;
  /** Stable identifier for diagnostics added in P1 (e.g. `requirement-undefined`). Older diagnostics have none. */
  code?: string;
}

/** Object types and interfaces share one name space — both become schema entities. */
export function findSchemaType(ontology: ObjectOntology, apiName: string): OoObjectType | OoInterface | undefined {
  return ontology.objectTypes.find((t) => t.apiName === apiName) ?? ontology.interfaces.find((i) => i.apiName === apiName);
}

/** Every object type and interface an action's parameters and rules touch. */
export function actionAffectedTypes(ontology: ObjectOntology, action: OoActionType): string[] {
  const affected = new Set<string>();
  for (const parameter of action.parameters) {
    if (parameter.objectType) {
      affected.add(parameter.objectType);
    }
  }
  for (const rule of action.rules) {
    if (rule.objectType) {
      affected.add(rule.objectType);
    }
    const link = rule.linkType ? ontology.linkTypes.find((l) => l.apiName === rule.linkType) : undefined;
    if (link) {
      affected.add(link.from.objectType);
      affected.add(link.to.objectType);
    }
  }
  return [...affected].filter((name) => findSchemaType(ontology, name) !== undefined).sort();
}

export type OoRequirementElementKind = "objectType" | "interface" | "linkType" | "actionType" | "validation";

export interface OoRequirementElement {
  kind: OoRequirementElementKind;
  /** The element's API name; for a validation, the API name of the action type that owns it. */
  apiName: string;
  /** Position of the validation in its action type's list. */
  validationIndex?: number;
}

/**
 * For every registry entry, the elements that reference it, in document
 * model order. A validation's references count for the validation only;
 * they are not inherited by its action type (P1 spec 4.2).
 */
export function requirementCoverage(ontology: ObjectOntology): Array<{ requirement: OoRequirement; elements: OoRequirementElement[] }> {
  const byId = new Map<string, OoRequirementElement[]>(ontology.requirements.map((r) => [r.id, []]));
  const add = (ids: readonly string[], element: OoRequirementElement): void => {
    for (const id of ids) {
      byId.get(id)?.push(element);
    }
  };
  for (const type of ontology.objectTypes) {
    add(type.requirements, { kind: "objectType", apiName: type.apiName });
  }
  for (const iface of ontology.interfaces) {
    add(iface.requirements, { kind: "interface", apiName: iface.apiName });
  }
  for (const link of ontology.linkTypes) {
    add(link.requirements, { kind: "linkType", apiName: link.apiName });
  }
  for (const action of ontology.actionTypes) {
    add(action.requirements, { kind: "actionType", apiName: action.apiName });
    action.validations.forEach((validation, validationIndex) => {
      add(validation.requirements, { kind: "validation", apiName: action.apiName, validationIndex });
    });
  }
  return ontology.requirements.map((requirement) => ({ requirement, elements: byId.get(requirement.id) ?? [] }));
}
