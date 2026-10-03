import { tester } from "../shared/rule-tester.ts";
import { layerNamingRule } from "./layer-naming.ts";

const error = { messageId: "name" };

tester.run("effect-style/layer-naming", layerNamingRule, {
  valid: [
    'import { Layer } from "effect"; class A { static readonly layerNoDeps = Layer.effect(A, make); static readonly layer = this.layerNoDeps.pipe(Layer.provide(B.layer)); }',
    'import { Layer } from "effect"; export const layerConfig = Layer.unwrap(makeFromConfig);',
    'import { Layer } from "effect"; export const AppLayer = Layer.mergeAll(A.layer, B.layer);',
    'import { Layer } from "effect"; export const ObservabilityLayer = Layer.mergeAll(Tracing, Logging);',
    'import { Layer } from "effect"; class A { static readonly layer = (options: Options) => Layer.effect(A, make(options)); }',
    "const ProductCatalogLive = makeSomething();",
    {
      code: 'import { Layer } from "effect"; const CatalogDown = Layer.mock(ProductCatalog, {});',
      filename: "catalog/product-catalog.test.ts",
    },
  ],
  invalid: [
    {
      code: 'import { Layer } from "effect"; export const ProductCatalogLive = Layer.effect(ProductCatalog, make);',
      errors: [error],
    },
    {
      code: 'import { Layer } from "effect"; class A { static readonly Default = Layer.effect(this, this.make); }',
      errors: [error],
    },
    {
      code: 'import { Layer } from "effect"; export const ProductCatalogTest = Layer.succeed(ProductCatalog, fake);',
      errors: [error],
    },
    {
      code: 'import { Layer } from "effect"; class A { static readonly live = this.layerNoDeps.pipe(Layer.provide(B.layer)); }',
      errors: [error],
    },
  ],
});
