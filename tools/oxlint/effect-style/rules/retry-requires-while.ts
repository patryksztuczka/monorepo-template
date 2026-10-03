import { defineRule } from "@oxlint/plugins";

import { findProperty } from "../shared/ast.ts";
import { isEffectCall } from "../shared/effect-imports.ts";

const retryMethods = new Set(["retry", "retryOrElse"]);

/** A retry must name the transient failures it retries. */
export const retryRequiresWhileRule = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require Effect.retry to state which failures are retried." },
    messages: {
      missingWhile:
        'Effect.retry retries every failure. Pass `{ schedule, times, while }` naming the transient errors, e.g. `while: Predicate.isTagged("…Error")` (see docs/effect-style-guide/03-retry-and-scheduling.md).',
    },
    schema: [],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isEffectCall(context.sourceCode, node, "Effect", retryMethods)) return;
        const [argument] = node.arguments;
        const filtered =
          argument?.type === "ObjectExpression" &&
          (findProperty(argument, "while") !== undefined ||
            findProperty(argument, "until") !== undefined);
        if (!filtered) context.report({ node, messageId: "missingWhile" });
      },
    };
  },
});
