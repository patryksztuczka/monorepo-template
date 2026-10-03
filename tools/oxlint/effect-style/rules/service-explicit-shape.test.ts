import { tester } from "../shared/rule-tester.ts";
import { serviceExplicitShapeRule } from "./service-explicit-shape.ts";

const error = { messageId: "missingShape" };

tester.run("effect-style/service-explicit-shape", serviceExplicitShapeRule, {
  valid: [
    'import { Context, Effect } from "effect"; export class ProductCatalog extends Context.Service<ProductCatalog, { readonly find: (id: string) => Effect.Effect<number> }>()("@example/modules/catalog/ProductCatalog") {}',
    'import { Context } from "effect"; export const Db = Context.Service<DbShape>("@example/infra/Db");',
    'const Context = { Service: () => () => class {} }; class X extends Context.Service<X>()("x") {}',
  ],
  invalid: [
    {
      code: 'import { Context, Effect } from "effect"; export class ProductCatalog extends Context.Service<ProductCatalog>()("@example/modules/catalog/ProductCatalog", { make: Effect.succeed({}) }) {}',
      errors: [error],
    },
    {
      code: 'import { Context } from "effect"; class X extends Context.Service()("x") {}',
      errors: [error],
    },
  ],
});
