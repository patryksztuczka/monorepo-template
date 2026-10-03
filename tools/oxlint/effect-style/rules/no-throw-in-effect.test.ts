import { tester } from "../shared/rule-tester.ts";
import { noThrowInEffectRule } from "./no-throw-in-effect.ts";

const error = { messageId: "throwInEffect" };

tester.run("effect-style/no-throw-in-effect", noThrowInEffectRule, {
  valid: [
    'function parse() { throw new Error("x"); }',
    'import { Effect } from "effect"; Effect.sync(() => { throw new Error("defect by design"); });',
    'import { Effect } from "effect"; Effect.gen(function* () { const f = () => { throw new Error("x"); }; });',
    'const Effect = { gen: (f) => f }; Effect.gen(function* () { throw new Error("x"); });',
    'import { Effect } from "effect"; Effect.gen(function* () { return yield* new CustomerNotVerifiedError({}); });',
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; Effect.gen(function* () { if (!customer) throw new Error("unknown"); });',
      errors: [error],
    },
    {
      code: 'import { Effect } from "effect"; const verify = Effect.fn("CustomerVerification.verify")(function* (id) { throw new Error(id); });',
      errors: [error],
    },
    {
      code: 'import { Effect } from "effect"; const verify = Effect.fnUntraced(function* (id) { throw new Error(id); });',
      errors: [error],
    },
    {
      code: 'import { Effect as E } from "effect"; E.gen(function* () { throw new Error("x"); });',
      errors: [error],
    },
    {
      code: 'import * as Effect from "effect/Effect"; Effect.gen(function* () { throw new Error("x"); });',
      errors: [error],
    },
  ],
});
