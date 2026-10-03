import { tester } from "../shared/rule-tester.ts";
import { boundedConcurrencyRule } from "./bounded-concurrency.ts";

tester.run("effect-style/bounded-concurrency", boundedConcurrencyRule, {
  valid: [
    'import { Effect } from "effect"; const PRICING_CONCURRENCY = 8; Effect.forEach(samples, match, { concurrency: PRICING_CONCURRENCY });',
    'import { Effect } from "effect"; Effect.all([loadCatalog, loadLedger], { concurrency: "unbounded" });',
    'import { Effect } from "effect"; Effect.forEach(samples, match);',
    'import { Effect } from "effect"; Effect.forEach(samples, match, { concurrency: "inherit" });',
    {
      code: 'import { Effect } from "effect"; Effect.forEach(samples, match, { concurrency: 8 });',
      options: [{ requireNamedConstant: false }],
    },
    'const Effect = { forEach() {} }; Effect.forEach(xs, f, { concurrency: "unbounded" });',
  ],
  invalid: [
    {
      code: 'import { Effect } from "effect"; Effect.forEach(samples, match, { concurrency: "unbounded" });',
      errors: [{ messageId: "unbounded" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.all(effects, { concurrency: "unbounded" });',
      errors: [{ messageId: "unbounded" }],
    },
    {
      code: 'import { Effect } from "effect"; Effect.forEach(samples, match, { concurrency: 8 });',
      errors: [{ messageId: "literal" }],
    },
    {
      code: 'import { Effect } from "effect"; samples.pipe(Effect.forEach(match, { concurrency: 4 }));',
      errors: [{ messageId: "literal" }],
    },
  ],
});
