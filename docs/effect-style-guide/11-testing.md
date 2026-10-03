# 11 · Testing

We write fewer tests with higher fidelity, **at the seams**. In priority order: runtimes, services, layers, errors. Tests exercise public service interfaces the way production calls them.

## Rules

### test.harness and r2.example.scenarios: `@effect/vitest`, one suite per scenario

`it.effect` gives each test a fresh `Scope`, a `TestClock` starting at 0 and a `TestConsole`. Each mock scenario is its own `layer(…)` suite, named after the scenario.

```ts
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Fiber, Layer } from "effect";
import { TestClock } from "effect/testing";

// scenario 1: the catalog has the product in stock
const CatalogInStock = Layer.mock(ProductCatalog, {
  offersFor: () => Effect.succeed([Samples.inStockOffer]),
});

layer(OrderPricer.layerNoDeps.pipe(Layer.provide(CatalogInStock)))("OrderPricer", (it) => {
  it.effect("prices a line from a warehouse that has the product", () =>
    Effect.gen(function* () {
      const pricer = yield* OrderPricer;
      const result = yield* pricer.price(Samples.singleItemLine);
      assert.strictEqual(result.warehouseId, Samples.inStockOffer.warehouseId);
      assert.strictEqual(DateTime.toEpochMillis(result.pricedAt), 0); // TestClock starts at 0
    }),
  );
});

// scenario 2: the inventory is down
const CatalogDown = Layer.mock(ProductCatalog, {
  offersFor: () => Effect.fail(new InventoryUnavailableError({ reason: "timeout" })),
});

layer(OrderPricer.layerNoDeps.pipe(Layer.provide(CatalogDown)))(
  "OrderPricer when the catalog is down",
  (it) => {
    it.effect("retries three times, then surfaces the outage", () =>
      Effect.gen(function* () {
        const pricer = yield* OrderPricer;
        const fiber = yield* Effect.forkChild(Effect.flip(pricer.price(Samples.singleItemLine)));
        yield* TestClock.adjust("1 second");
        const error = yield* Fiber.join(fiber);
        assert.strictEqual(error._tag, "InventoryUnavailableError");
      }),
    );
  },
);
```

Plain Vitest with `Effect.runPromise` is not allowed: it has no TestClock and no scope, and failures turn into promise rejections.

### test.scope: test the seams first

| Seam            | What to test                                                |
| --------------- | ----------------------------------------------------------- |
| Services        | the public interface, through `layerNoDeps` + mocks         |
| Errors          | every tag in a method's signature has a test                |
| Layers          | the application layer graph builds with test infrastructure |
| Runtimes        | the app starts and shuts down                               |
| Pure algorithms | property tests with `it.prop` and Schemas                   |

```ts
// tests/layers-integration.test.ts: the production graph builds
it.effect("the application layer graph builds", () =>
  Layer.build(AppLayer.pipe(Layer.provide(PgTest.layer))).pipe(Effect.asVoid),
);

// modules/order/tests/order-pricing-unit.test.ts: a pure module gets property tests
it.prop(
  "a line is priced from its cheapest offer",
  [Samples.OrderLineSchema],
  ([line]) =>
    bestOffer(line, [Samples.cheapestOfferFor(line), Samples.dearOffer])?.warehouseId ===
    Samples.cheapestOfferFor(line).warehouseId,
);
```

Do not unit test internals with `vi.mock` and call-count assertions. Such tests check the implementation rather than the behaviour.

### test.errors: `Effect.flip` and assert on the tag

```ts
// good
const error = yield * verification.verify(Samples.unknownCustomer).pipe(Effect.flip);
assert.strictEqual(error._tag, "CustomerNotVerifiedError");

// bad: loses the type and passes for any error
await expect(Effect.runPromise(verify(c))).rejects.toThrow();
```

No `try` in tests: a `catch` accepts whatever was thrown. Assert an Effect's failure with `Effect.flip` or `Effect.exit`, and a pure function's refusal on the `Result` it returns. Restore state with a scoped resource (`Effect.acquireRelease`, a layer), not `finally`.

```ts
// good
const result = parseLimit("0");
assertTrue(Result.isFailure(result));
assert.strictEqual(result.failure._tag, "InvalidLimitError");

// bad: passes when nothing throws, and needs an Error subclass to recognise the refusal
try {
  parseLimit("0");
} catch (cause) {
  assert.ok(cause instanceof Refusal);
}
```

### defaults.tests: time and randomness

Time-dependent tests use `TestClock.adjust`. Random-dependent tests pin `Random.withSeed`. See [01](01-default-services.md).

## v4 notes

- `it.scoped` is gone; use `it.effect`.
- `TestClock` comes from `effect/testing`.
- `it.prop` takes Schemas.
- Assertion helpers live in `@effect/vitest/utils`.
- `@effect/vitest` `4.0.0` needs Vitest 5; the repo runs the Vitest 5 bundled by `vite-plus` 1.x.

Sources: [@effect/vitest README](https://github.com/Effect-TS/effect/blob/main/packages/vitest/README.md), [v3-to-v4.md](https://github.com/Effect-TS/effect/blob/main/migration/v3-to-v4.md)
