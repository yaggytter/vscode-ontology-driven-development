import { requirementCoverage, type ObjectOntology, type OoProperty, type OoRequirementElement } from "../model";

export interface ContextSummaryOptions {
  /** Include up to this many example objects per type (0 = none). */
  examplesPerType: number;
}

const DEFAULT_OPTIONS: ContextSummaryOptions = { examplesPerType: 3 };

function propertyLine(property: OoProperty, primaryKey?: string): string {
  const type = `${property.type}${property.isArray ? "[]" : ""}`;
  const notes = [
    property.apiName === primaryKey ? "primary key" : undefined,
    property.required ? "required" : undefined,
    property.unit ? `unit: ${property.unit}` : undefined,
    property.enumValues?.length ? `one of: ${property.enumValues.join(" | ")}` : undefined,
  ].filter(Boolean);
  const label = property.displayName && property.displayName !== property.apiName ? ` "${property.displayName}"` : "";
  const description = property.description ? ` — ${property.description}` : "";
  return `  - ${property.apiName}${label}: ${type}${notes.length ? ` (${notes.join(", ")})` : ""}${description}`;
}

/** `Requirements: A, B` for an element that references requirements; nothing otherwise. */
function requirementsLine(ids: readonly string[]): string[] {
  return ids.length > 0 ? [`Requirements: ${ids.join(", ")}`] : [];
}

function describeElement(element: OoRequirementElement): string {
  switch (element.kind) {
    case "objectType":
      return `object type ${element.apiName}`;
    case "interface":
      return `interface ${element.apiName}`;
    case "linkType":
      return `link ${element.apiName}`;
    case "actionType":
      return `action ${element.apiName}`;
    case "validation":
      return `a validation of action ${element.apiName}`;
  }
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(", ")}]`;
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * A compact Markdown description of the ontology for an LLM's context
 * window (system prompt, project knowledge, a CLAUDE.md section …).
 *
 * Written for a model rather than a person: every name is the exact API
 * name the model must use in tool calls or queries, cardinalities are
 * spelled out in words, and actions are listed as "the only ways to change
 * data" so the model is steered toward them instead of inventing writes.
 */
export function buildContextSummary(ontology: ObjectOntology, options: ContextSummaryOptions = DEFAULT_OPTIONS): string {
  const out: string[] = [];
  out.push(`# Ontology: ${ontology.name}`);
  if (ontology.description) {
    out.push("", ontology.description);
  }
  out.push(
    "",
    "Use these exact API names. Objects are identified by their type's primary key.",
    "Only the actions listed below may change data; everything else is read-only.",
  );

  if (ontology.objectTypes.length > 0) {
    out.push("", "## Object types");
    for (const type of ontology.objectTypes) {
      const label = type.displayName && type.displayName !== type.apiName ? ` ("${type.displayName}")` : "";
      out.push("", `### ${type.apiName}${label}`);
      out.push(...requirementsLine(type.requirements));
      if (type.description) {
        out.push(type.description);
      }
      if (type.implements.length > 0) {
        out.push(`Implements: ${type.implements.join(", ")}`);
      }
      out.push("Properties:", ...type.properties.map((p) => propertyLine(p, type.primaryKey)));
    }
  }

  if (ontology.interfaces.length > 0) {
    out.push("", "## Interfaces");
    for (const iface of ontology.interfaces) {
      const implementers = ontology.objectTypes.filter((t) => t.implements.includes(iface.apiName)).map((t) => t.apiName);
      out.push(
        "",
        `### ${iface.apiName}`,
        ...requirementsLine(iface.requirements),
        ...(iface.description ? [iface.description] : []),
        ...(iface.extends.length ? [`Extends: ${iface.extends.join(", ")}`] : []),
        `Implemented by: ${implementers.join(", ") || "(none)"}`,
        ...iface.properties.map((p) => propertyLine(p)),
      );
    }
  }

  if (ontology.linkTypes.length > 0) {
    out.push("", "## Links");
    for (const link of ontology.linkTypes) {
      const fromCount = link.from.cardinality === "one" ? "exactly one" : "many";
      const toCount = link.to.cardinality === "one" ? "exactly one" : "many";
      out.push(
        `- ${link.apiName}${link.displayName ? ` ("${link.displayName}")` : ""}: each ${link.from.objectType} has ${fromCount} ${link.to.objectType} via \`${link.from.name}\`; each ${link.to.objectType} has ${toCount} ${link.from.objectType} via \`${link.to.name}\`.${link.foreignKey ? ` Backed by ${link.foreignKey.objectType}.${link.foreignKey.property}.` : ""}${link.requirements.length ? ` Requirements: ${link.requirements.join(", ")}.` : ""}`,
      );
    }
  }

  if (ontology.actionTypes.length > 0) {
    out.push("", "## Actions (the only allowed writes)");
    for (const action of ontology.actionTypes) {
      out.push("", `### ${action.apiName}${action.displayName ? ` ("${action.displayName}")` : ""}`);
      out.push(...requirementsLine(action.requirements));
      if (action.description) {
        out.push(action.description);
      }
      out.push(
        "Parameters:",
        ...action.parameters.map(
          (p) =>
            `  - ${p.id}: ${p.type === "objectRef" ? `${p.objectType ?? "object"} (by primary key)` : p.type}${p.isArray ? "[]" : ""}${p.required ? ", required" : ""}${p.description ? ` — ${p.description}` : ""}`,
        ),
      );
      if (action.rules.length > 0) {
        out.push(
          "Effects:",
          ...action.rules.map((r) => `  - ${r.op} ${r.objectType ?? r.linkType ?? ""}${Object.keys(r.set).length ? ` (sets ${Object.keys(r.set).join(", ")})` : ""}`),
        );
      }
      if (action.validations.length > 0) {
        out.push(
          "Rejected unless:",
          ...action.validations.map((v) => `  - ${v.description}${v.requirements.length ? ` (requirements: ${v.requirements.join(", ")})` : ""}`),
        );
      }
      if (action.sideEffects.length > 0) {
        out.push("Side effects:", ...action.sideEffects.map((s) => `  - ${s}`));
      }
    }
  }

  if (ontology.requirements.length > 0) {
    out.push("", "## Requirements");
    for (const { requirement, elements } of requirementCoverage(ontology)) {
      const realizedBy = elements.length ? `realized by ${elements.map(describeElement).join(", ")}` : "not referenced by any element yet";
      out.push(`- ${requirement.id}: ${requirement.title} — ${realizedBy}`);
    }
  }

  if (options.examplesPerType > 0 && ontology.objects.length > 0) {
    out.push("", "## Example objects");
    for (const type of ontology.objectTypes) {
      const examples = ontology.objects.filter((o) => o.objectType === type.apiName).slice(0, options.examplesPerType);
      if (examples.length === 0) {
        continue;
      }
      out.push(`- ${type.apiName}:`);
      for (const example of examples) {
        out.push(`  - ${[...example.values].map(([k, v]) => `${k}=${formatValue(v)}`).join(", ")}`);
      }
    }
  }
  return `${out.join("\n")}\n`;
}
