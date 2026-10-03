import { tester } from "../shared/rule-tester.ts";
import { effectFnNameRule } from "./effect-fn-name.ts";

const inService = (body: string): string =>
  `import { Context, Effect, Layer } from "effect"; class OrderPricer extends Context.Service<OrderPricer, Shape>()("id") { static readonly layer = Layer.effect(OrderPricer, Effect.gen(function* () { ${body} })) }`;

tester.run("effect-style/effect-fn-name", effectFnNameRule, {
  valid: [
    inService(
      'const price = Effect.fn("OrderPricer.price")(function* (line) {}); return OrderPricer.of({ price });',
    ),
    inService(
      'return OrderPricer.of({ price: Effect.fn("OrderPricer.price")(function* (line) {}) });',
    ),
    'import { Effect } from "effect"; export const compactLedger = Effect.fn("LedgerCompaction.run")(function* () {});',
    {
      code: inService('const price = Effect.fn("anything")(function* () {});'),
      options: [{ matchEnclosing: false }],
    },
    "const Effect = { fn: (f) => f }; const x = Effect.fn(function* () {});",
  ],
  invalid: [
    {
      code: inService("const price = Effect.fn(function* (line) {});"),
      errors: [{ messageId: "missing" }],
      output: inService('const price = Effect.fn("OrderPricer.price")(function* (line) {});'),
    },
    {
      code: inService('const price = Effect.fn("pricing")(function* (line) {});'),
      errors: [{ messageId: "mismatch" }],
      output: inService('const price = Effect.fn("OrderPricer.price")(function* (line) {});'),
    },
    {
      code: 'import { Effect } from "effect"; const run = Effect.fn(function* () {});',
      errors: [{ messageId: "missing" }],
    },
    {
      code: 'import { Effect } from "effect"; const run = Effect.fn(spanName)(function* () {});',
      errors: [{ messageId: "nonLiteral" }],
    },
  ],
});
