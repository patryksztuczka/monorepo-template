import { tester } from "../shared/rule-tester.ts";
import { layerConfigOnlyInRootsRule } from "./layer-config-only-in-roots.ts";

const error = { messageId: "notRoot" };

tester.run("effect-style/layer-config-only-in-roots", layerConfigOnlyInRootsRule, {
  valid: [
    {
      code: "export const AppLayer = Layer.mergeAll(A.layer).pipe(Layer.provide(Database.layerConfig));",
      filename: "apps/api/src/layers.ts",
    },
    {
      code: "program.pipe(Effect.provide(Database.layerConfig));",
      filename: "apps/worker/src/jobs/compact-ledger.ts",
    },
    {
      code: 'export const layerConfig = PgClient.layerConfig({ url: Config.Redacted("DATABASE_URL") });',
      filename: "apps/api/src/infra/database.ts",
    },
    {
      code: 'class A { static readonly layerConfig = Layer.unwrap(Effect.map(Config.Number("X"), (x) => A.layer({ x }))); }',
      filename: "apps/api/src/m/A.ts",
    },
    {
      code: "const x = Database.layer({ url, maxConnections: 2 });",
      filename: "apps/api/src/m/A.test.ts",
    },
  ],
  invalid: [
    {
      code: 'layer(ProductCatalog.layer.pipe(Layer.provide(Database.layerConfig)))("x", (it) => {});',
      filename: "apps/api/src/modules/catalog/tests/product-catalog.test.ts",
      errors: [error],
    },
    {
      code: "class A { static readonly layer = this.layerNoDeps.pipe(Layer.provide(Database.layerConfig)); }",
      filename: "apps/api/src/modules/orders/order-pricer.ts",
      errors: [error],
    },
    {
      code: "program.pipe(Effect.provide(Database.layerConfig));",
      filename: "apps/api/src/jobs/x.ts",
      options: [{ allow: ["apps/api/src/index.ts"] }],
      errors: [error],
    },
  ],
});
