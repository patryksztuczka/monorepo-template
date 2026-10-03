import { tester } from "../shared/rule-tester.ts";
import { serviceIdMatchesPathRule } from "./service-id-matches-path.ts";

const service = (name: string, id: string): string =>
  `import { Context } from "effect"; export class ${name} extends Context.Service<${name}, Shape>()(${JSON.stringify(id)}) {}`;

const file = "apps/api/src/modules/orders/order-pricer.ts";
const byFile = [{ idSource: "file" }];

tester.run("effect-style/service-id-matches-path", serviceIdMatchesPathRule, {
  valid: [
    {
      code: service("OrderPricer", "@example/modules/orders/OrderPricer"),
      filename: file,
    },
    { code: service("Anything", "whatever"), filename: "scripts/tool.ts" },
    {
      code: service("TestPostgres", "@example/test/TestPostgres"),
      filename: "apps/api/test/test-postgres.ts",
      options: [{ extraRoots: { "apps/*/test": "@example/test" } }],
    },
    {
      code: service(
        "DailySettlementWorkflow",
        "@example/orders/settlement/DailySettlementWorkflow",
      ),
      filename: "apps/api/src/modules/orders/settlement/daily-settlement.workflow.ts",
      options: [{ sourceRoot: "apps/*/src/modules" }],
    },
    {
      code: service("OrderPricer", "@example/modules/orders/OrderPricer"),
      filename: "apps/api/src/modules/orders/OrderPricer.ts",
      options: byFile,
    },
  ],
  invalid: [
    {
      code: service("OrderPricer", "Pricer"),
      filename: file,
      errors: [{ messageId: "id" }],
      output: service("OrderPricer", "@example/modules/orders/OrderPricer"),
    },
    {
      code: service("DailySettlementWorkflow", "DailySettlementWorkflow"),
      filename: "apps/api/src/modules/orders/settlement/daily-settlement.workflow.ts",
      options: [{ sourceRoot: "apps/*/src/modules" }],
      errors: [{ messageId: "id" }],
      output: service(
        "DailySettlementWorkflow",
        "@example/orders/settlement/DailySettlementWorkflow",
      ),
    },
    {
      code: service("OrderPricer", "@example/modules/OrderPricer"),
      filename: file,
      options: [{ prefix: "acme" }],
      errors: [{ messageId: "id" }],
      output: service("OrderPricer", "acme/modules/orders/OrderPricer"),
    },
    {
      code: service("Pricer", "@example/modules/orders/OrderPricer"),
      filename: "apps/api/src/modules/orders/OrderPricer.ts",
      options: byFile,
      errors: [{ messageId: "className" }],
    },
  ],
});
