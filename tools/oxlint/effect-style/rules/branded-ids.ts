import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";

import { keyName } from "../shared/ast.ts";
import { effectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";

const plainPrimitives = new Set(["String", "Number", "UUID", "Int", "NonEmptyString", "Trimmed"]);
const wrappers = new Set(["optional", "optionalKey", "NullOr", "UndefinedOr", "NullishOr"]);
const fieldCallFactories = new Set(["Struct", "TaggedStruct"]);
const classFactories = new Set([
  "Class",
  "TaggedClass",
  "TaggedError",
  "TaggedErrorClass",
  "ErrorClass",
  "Error",
  "TaggedRequest",
]);

/** Whether a field schema is an unbranded primitive, possibly wrapped in optional/nullable. */
const isPlainPrimitive = (sourceCode: SourceCode, node: ESTree.Node): boolean => {
  const member = effectMember(sourceCode, node);
  if (member?.module === "Schema") return plainPrimitives.has(member.member);
  if (node.type === "CallExpression") {
    const wrapper = effectMember(sourceCode, node.callee);
    const [inner] = node.arguments;
    return (
      wrapper?.module === "Schema" &&
      wrappers.has(wrapper.member) &&
      inner !== undefined &&
      isPlainPrimitive(sourceCode, inner)
    );
  }
  return false;
};

/** Whether an object literal is the field map of a Schema struct or class. */
const isFieldsObject = (sourceCode: SourceCode, object: ESTree.ObjectExpression): boolean => {
  const call = object.parent;
  if (call?.type !== "CallExpression" || !call.arguments.some((argument) => argument === object))
    return false;
  const factory = effectMember(sourceCode, call.callee);
  if (factory?.module === "Schema" && fieldCallFactories.has(factory.member)) return true;
  // `Schema.Class<Self>("Name")(fields)` / `Schema.TaggedError<Self>()("Tag", fields)`
  if (call.callee.type !== "CallExpression") return false;
  const classFactory = effectMember(sourceCode, call.callee.callee);
  return classFactory?.module === "Schema" && classFactories.has(classFactory.member);
};

/** Identifier fields use branded schemas so ids of different kinds cannot be swapped. */
export const brandedIdsRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require identifier fields in Schema structs and classes to be branded." },
    messages: {
      unbranded:
        "`{{key}}` is an identifier: use a branded schema (e.g. `{{brand}}`), not a plain `Schema.{{primitive}}` (see docs/effect-style-guide/06-schema.md).",
    },
    schema: [
      {
        type: "object",
        properties: { keyPattern: { type: "string" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ keyPattern: "(^id|Id)$" }],
  },
  createOnce(context) {
    return {
      ObjectExpression(node) {
        const sourceCode = context.sourceCode;
        if (!isFieldsObject(sourceCode, node)) return;
        const { keyPattern } = ruleOptions(context, { keyPattern: "(^id|Id)$" });
        const pattern = new RegExp(keyPattern);
        for (const property of node.properties) {
          if (property.type !== "Property" || property.computed) continue;
          const key = keyName(property.key);
          if (
            key === undefined ||
            !pattern.test(key) ||
            !isPlainPrimitive(sourceCode, property.value)
          )
            continue;
          const brand = key.charAt(0).toUpperCase() + key.slice(1);
          const primitive = sourceCode
            .getText(property.value)
            .replace(/^.*Schema\./, "")
            .replace(/\).*$/, "");
          context.report({
            node: property,
            messageId: "unbranded",
            data: { key, brand, primitive },
          });
        }
      },
    };
  },
});
