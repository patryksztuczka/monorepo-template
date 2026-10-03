import { tester } from "../shared/rule-tester.ts";
import { noTryInTestsRule } from "./no-try-in-tests.ts";

const error = { messageId: "tryInTest" };
const tryCatch = "try { await verify(customer); } catch (cause) { refusal = cause; }";

tester.run("effect-style/no-try-in-tests", noTryInTestsRule, {
  valid: [
    { code: tryCatch, filename: "apps/api/src/modules/identity/identity.persistence.ts" },
    {
      code: 'import { Effect } from "effect"; it.effect("refuses", () => Effect.gen(function* () { const error = yield* verification.verify(customer).pipe(Effect.flip); }));',
      filename: "apps/api/src/modules/identity/a.test.ts",
    },
    {
      code: tryCatch,
      filename: "apps/api/src/modules/identity/a.test.ts",
      options: [{ tests: ["**/*.spec.ts"] }],
    },
  ],
  invalid: [
    { code: tryCatch, filename: "apps/api/src/modules/identity/a.test.ts", errors: [error] },
    {
      code: "try { await run(); } finally { await pool.end(); }",
      filename: "apps/api/src/modules/orders/tests/daily-settlement.integration.test.ts",
      errors: [error],
    },
    {
      code: tryCatch,
      filename: "apps/api/src/modules/identity/a.spec.ts",
      options: [{ tests: ["**/*.spec.ts"] }],
      errors: [error],
    },
  ],
});
