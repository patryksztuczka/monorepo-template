import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

/** The class name on the right of `instanceof`: `FooError` or `errors.FooError`. */
const className = (node: ESTree.Node): string | undefined => {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  return undefined;
};

/** Recovery goes by tag, not by class. */
export const noErrorInstanceofRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow `instanceof` checks against error classes." },
    messages: {
      errorInstanceof:
        '`instanceof {{name}}` recovers by class, and treats a defect that happens to be one as an expected failure. Recover with `Effect.catchTag` / `catchTags`, test a value with `Predicate.isTagged("…")` or `Schema.is(…)`, or use `Predicate.isError` for a foreign value (see docs/effect-style-guide/02-typed-errors.md).',
    },
    schema: [],
  },
  createOnce(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== "instanceof") return;
        const name = className(node.right);
        if (name === undefined || !name.endsWith("Error")) return;
        context.report({
          node,
          messageId: "errorInstanceof",
          data: { name: context.sourceCode.getText(node.right) },
        });
      },
    };
  },
});
