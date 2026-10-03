import { defineRule } from "@oxlint/plugins";

import { staticString } from "../shared/ast.ts";
import { isEffectCall } from "../shared/effect-imports.ts";

const logMethods = new Set([
  "log",
  "logTrace",
  "logDebug",
  "logInfo",
  "logWarning",
  "logError",
  "logFatal",
]);

/** Log messages are constant; values go in the fields object. */
export const logLiteralMessageRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require a constant string message as the first argument of Effect.log*.",
    },
    messages: {
      dynamicMessage:
        'Log a constant message and pass values in a fields object, e.g. `Effect.logInfo("Payment recorded", { customerId })` (see docs/effect-style-guide/08-observability.md).',
    },
    schema: [],
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isEffectCall(context.sourceCode, node, "Effect", logMethods)) return;
        const [message] = node.arguments;
        if (message !== undefined && staticString(message) === undefined) {
          context.report({ node: message, messageId: "dynamicMessage" });
        }
      },
    };
  },
});
