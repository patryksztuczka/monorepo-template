import { defineRule } from "@oxlint/plugins";

import { isEffectCall } from "../shared/effect-imports.ts";

/** Services declare their shape: `Context.Service<Self, Shape>()(id)`. */
export const serviceExplicitShapeRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require Context.Service classes to declare their shape type." },
    messages: {
      missingShape:
        "Declare the service shape as the second type argument: `Context.Service<Self, Shape>()(id)`, so the contract is visible and implementations cannot widen it (see docs/effect-style-guide/04-services-and-layers.md).",
    },
    schema: [],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isEffectCall(context.sourceCode, node, "Context", "Service")) return;
        // The function form `Context.Service<Shape>("id")` takes the id directly.
        if (node.arguments.length > 0) return;
        const typeArguments = node.typeArguments?.params.length ?? 0;
        if (typeArguments < 2) context.report({ node, messageId: "missingShape" });
      },
    };
  },
});
