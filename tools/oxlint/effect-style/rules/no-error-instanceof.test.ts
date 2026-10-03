import { tester } from "../shared/rule-tester.ts";
import { noErrorInstanceofRule } from "./no-error-instanceof.ts";

const error = { messageId: "errorInstanceof" };

tester.run("effect-style/no-error-instanceof", noErrorInstanceofRule, {
  valid: [
    "const isDay = (value) => value instanceof Date;",
    "const isBytes = (body) => body instanceof Uint8Array;",
    'import { Predicate } from "effect"; const lost = Predicate.isTagged(cause, "WorkflowClaimLostError");',
    'import { Predicate } from "effect"; const message = Predicate.isError(cause) ? cause.message : String(cause);',
    'import { Effect } from "effect"; program.pipe(Effect.catchTag("UserNotFoundError", () => Effect.succeed(null)));',
  ],
  invalid: [
    {
      code: "const message = cause instanceof Error ? cause.message : String(cause);",
      errors: [error],
    },
    {
      code: "const recovered = cause instanceof UserNotFoundError ? cause : new MalformedRequestError({});",
      errors: [{ ...error, data: { name: "UserNotFoundError" } }],
    },
    {
      code: "if (!(cause instanceof TypeError)) rethrow(cause);",
      errors: [error],
    },
    {
      code: "const lost = cause instanceof errors.WorkflowClaimLostError;",
      errors: [{ ...error, data: { name: "errors.WorkflowClaimLostError" } }],
    },
  ],
});
