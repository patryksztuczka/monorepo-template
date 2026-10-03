import { defineRule } from "@oxlint/plugins";

import { findProperty } from "../shared/ast.ts";
import { isEffectCall, isEffectMember } from "../shared/effect-imports.ts";
import { ruleOptions } from "../shared/options.ts";

const concurrentCombinators = new Set([
  "all",
  "forEach",
  "validateAll",
  "partition",
  "filter",
  "mergeAll",
]);

/** Concurrency is a named bound; "unbounded" only for a fixed tuple of known effects. */
export const boundedConcurrencyRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require bounded, named concurrency for Effect collection combinators." },
    messages: {
      unbounded:
        '`concurrency: "unbounded"` puts no limit on load. Use a named numeric constant; "unbounded" is only for `Effect.all` over a fixed tuple (see docs/effect-style-guide/09-concurrency-and-resources.md).',
      literal:
        "Put the concurrency limit in a named constant (e.g. `PRICING_CONCURRENCY`) so the bound is explained and shared (see docs/effect-style-guide/09-concurrency-and-resources.md).",
    },
    schema: [
      {
        type: "object",
        properties: { requireNamedConstant: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ requireNamedConstant: true }],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const sourceCode = context.sourceCode;
        if (!isEffectCall(sourceCode, node, "Effect", concurrentCombinators)) return;
        const options = node.arguments.at(-1);
        if (options?.type !== "ObjectExpression") return;
        const concurrency = findProperty(options, "concurrency")?.value;
        if (concurrency?.type !== "Literal") return;
        if (concurrency.value === "unbounded") {
          const fixedTuple =
            isEffectMember(sourceCode, node.callee, "Effect", "all") &&
            node.arguments[0]?.type === "ArrayExpression";
          if (!fixedTuple) context.report({ node: concurrency, messageId: "unbounded" });
          return;
        }
        const { requireNamedConstant } = ruleOptions(context, { requireNamedConstant: true });
        if (requireNamedConstant && typeof concurrency.value === "number") {
          context.report({ node: concurrency, messageId: "literal" });
        }
      },
    };
  },
});
