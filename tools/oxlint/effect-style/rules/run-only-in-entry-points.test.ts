import { tester } from "../shared/rule-tester.ts";
import { runOnlyInEntryPointsRule } from "./run-only-in-entry-points.ts";

const route = "apps/api/src/modules/orders/order-routes.ts";

tester.run("effect-style/run-only-in-entry-points", runOnlyInEntryPointsRule, {
  valid: [
    {
      code: 'import { NodeRuntime } from "@effect/platform-node"; import { Layer } from "effect"; Layer.launch(AppLayer).pipe(NodeRuntime.runMain);',
      filename: "apps/api/src/index.ts",
    },
    {
      code: 'import { ManagedRuntime } from "effect"; export const runtime = ManagedRuntime.make(AppLayer);',
      filename: "apps/web/src/runtime.ts",
    },
    { code: "export const POST = (req) => runtime.runPromise(handle(req));", filename: route },
    {
      code: 'import { Effect } from "effect"; Effect.runPromise(program);',
      filename: "apps/worker/src/jobs/compact-ledger.ts",
    },
    {
      code: 'import { ManagedRuntime } from "effect"; const runtime = ManagedRuntime.make(TestPostgres.layer);',
      filename: "vitest.global-setup.ts",
    },
    {
      code: "const Effect = { runPromise: (x) => x }; Effect.runPromise(program);",
      filename: route,
    },
    {
      code: 'import { Effect } from "effect"; Effect.runPromise(program);',
      filename: "apps/api/src/server.ts",
      options: [{ allow: ["apps/api/src/server.ts"] }],
    },
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; export const handler = (req) => Effect.runPromise(handle(req));',
      filename: route,
      errors: [{ messageId: "notEntry" }],
    },
    {
      code: 'import { NodeRuntime } from "@effect/platform-node"; program.pipe(NodeRuntime.runMain);',
      filename: route,
      errors: [{ messageId: "notEntry" }],
    },
    {
      code: 'import { ManagedRuntime } from "effect"; const runtime = ManagedRuntime.make(AppLayer);',
      filename: route,
      errors: [{ messageId: "notEntry" }],
    },
    {
      code: 'import { Effect } from "effect"; test("matches", async () => { await Effect.runPromise(program); });',
      filename: "apps/api/src/modules/orders/tests/order-pricer.test.ts",
      errors: [{ messageId: "inTests" }],
    },
  ],
});
