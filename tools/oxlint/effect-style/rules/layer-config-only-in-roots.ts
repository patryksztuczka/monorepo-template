import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { keyName } from "../shared/ast.ts";
import { ruleOptions } from "../shared/options.ts";
import { matchesAny, relativeFilename } from "../shared/paths.ts";

const defaultAllow = ["apps/*/src/layers.ts", "apps/*/src/index.ts", "apps/*/src/jobs/**"];

/** Whether the reference is part of a binding named `layerConfig`, i.e. a definition, not a use. */
const isInsideLayerConfigDefinition = (node: ESTree.Node): boolean => {
  let current = node.parent;
  while (current !== null && current !== undefined) {
    if (current.type === "VariableDeclarator") {
      return current.id.type === "Identifier" && current.id.name === "layerConfig";
    }
    if (current.type === "PropertyDefinition") {
      return !current.computed && keyName(current.key) === "layerConfig";
    }
    current = current.parent;
  }
  return false;
};

/** `layerConfig` reads the environment; only composition roots may use it. */
export const layerConfigOnlyInRootsRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Restrict use of `layerConfig` layers to composition roots." },
    messages: {
      notRoot:
        "`{{object}}.layerConfig` reads the environment. Only composition roots (AppLayer, jobs, index) may use it; use `layer(options)` here (see docs/effect-style-guide/07-configuration.md).",
    },
    schema: [
      {
        type: "object",
        properties: { allow: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allow: defaultAllow }],
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        if (
          node.computed ||
          node.property.type !== "Identifier" ||
          node.property.name !== "layerConfig"
        )
          return;
        const { allow } = ruleOptions(context, { allow: defaultAllow });
        if (matchesAny(relativeFilename(context), allow)) return;
        if (isInsideLayerConfigDefinition(node)) return;
        const object = node.object.type === "Identifier" ? node.object.name : "…";
        context.report({ node, messageId: "notRoot", data: { object } });
      },
    };
  },
});
