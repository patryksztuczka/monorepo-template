import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { isAmbientGlobal } from "../shared/scope.ts";

/** `new Date()` / `Date()` read the wall clock behind the Clock service's back. */
export const noAmbientDateRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow reading the wall clock with an argument-less `new Date()` or `Date()`.",
    },
    messages: {
      ambientDate:
        "`{{call}}` reads the wall clock, which TestClock cannot control. Use `yield* DateTime.now` (see docs/effect-style-guide/01-default-services.md).",
    },
    schema: [],
  },
  createOnce(context) {
    const check = (node: ESTree.NewExpression | ESTree.CallExpression, call: string): void => {
      if (node.callee.type !== "Identifier" || node.callee.name !== "Date") return;
      if (node.arguments.length > 0) return;
      if (!isAmbientGlobal(context.sourceCode, node.callee)) return;
      context.report({ node, messageId: "ambientDate", data: { call } });
    };
    return {
      NewExpression(node) {
        check(node, "new Date()");
      },
      CallExpression(node) {
        check(node, "Date()");
      },
    };
  },
});
