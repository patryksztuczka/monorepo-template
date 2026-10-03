import { tester } from "../shared/rule-tester.ts";
import { logLiteralMessageRule } from "./log-literal-message.ts";

const error = { messageId: "dynamicMessage" };

tester.run("effect-style/log-literal-message", logLiteralMessageRule, {
  valid: [
    'import { Effect } from "effect"; Effect.logInfo("Payment recorded", { customerId, sourceId });',
    'import { Effect } from "effect"; Effect.logWarning(`Warehouse unavailable`);',
    'import { Effect } from "effect"; Effect.log();',
    "const Effect = { logInfo: (m) => m }; Effect.logInfo(message);",
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; Effect.logInfo("Recorded payment for " + customerId);',
      errors: [error],
    },
    { code: 'import { Effect } from "effect"; Effect.logWarning(errorMessage);', errors: [error] },
    {
      code: 'import { Effect } from "effect"; Effect.logError(`Failed for ${customerId}`);',
      errors: [error],
    },
  ],
});
