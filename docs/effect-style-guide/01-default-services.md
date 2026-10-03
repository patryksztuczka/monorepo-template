# 01 · Default services

Effect gives every program five services for free: **Clock, Random, Console, ConfigProvider, Tracer**. Each is a `Context.Reference` with a live default, so using one adds nothing to `R`. The test kit knows how to control them. We use them instead of the globals, and we never write our own replacement.

## What replaces what

| Instead of                  | Use                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `Date.now()`, `new Date()`  | `yield* DateTime.now` for domain timestamps, `yield* Clock.monotonicTimeNanos` for durations |
| `Math.random()`             | `yield* Random.next`, `Random.nextIntBetween`, `Random.shuffle`                              |
| `console.log`               | `yield* Effect.logInfo("Constant message", { fields })`                                      |
| `setTimeout`, `setInterval` | `Effect.sleep`, `Effect.repeat(Schedule…)`                                                   |
| `process.env.X`             | `yield* Config.string("X")`, inside a `layerConfig` only (see [07](07-configuration.md))     |

## Rules

### defaults.time: time comes from the Clock

Domain timestamps come from `DateTime.now`, and durations use `Clock.monotonicTimeNanos`. `DateTime.nowUnsafe` is banned because it calls `Date.now()` and ignores the Clock, so `TestClock` cannot control it.

```ts
// good
const recordPayment = Effect.fn("PaymentLedger.record")(function* (order: Order) {
  const paidAt = yield* DateTime.now;
  const t0 = yield* Clock.monotonicTimeNanos;
  // ...
});

// bad
const paidAt = new Date();
const paidAt = DateTime.nowUnsafe();
```

Do not wrap the clock in a service of our own, such as a `TimeProvider`. `Effect.sleep`, `Schedule`, `Effect.timeout` and `TestClock` all use `Clock` and would not see it.

### defaults.globals: no ambient globals in Effect code

Effect code never touches `Date.now`, `Math.random`, `console`, timers or `process.env`. The only exempt files are `scripts/**` and Vitest global setup files. Entry points (`index.ts`, `jobs/*.ts`, `runtime.ts`) follow every rule; with `runMain` and `Config` they don't need exemptions.

### defaults.tests: tests control time and randomness

Time-dependent tests use `TestClock.adjust`, which `it.effect` provides automatically, starting at 0. Tests that depend on randomness pin `Random.withSeed`.

```ts
import { assert, it } from "@effect/vitest";
import { Effect, Fiber, Random } from "effect";
import { TestClock } from "effect/testing";

it.effect("abandons the checkout after 30 s of inactivity", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(watchCheckout(customerId));
    yield* TestClock.adjust("30 seconds");
    const result = yield* Fiber.join(fiber);
    assert.strictEqual(result._tag, "CheckoutAbandoned");
  }).pipe(Random.withSeed("checkout-test")),
);
```

Do not use `vi.useFakeTimers()`. It patches globals behind Effect's back.

## Overriding a default service

v4 removed `DefaultServices`, `Effect.withClock`, `withRandom`, `withConsole` and `Layer.setClock`. To override a default service:

```ts
program.pipe(Effect.provideService(Clock.Clock, customClock));
Layer.succeed(Clock.Clock, customClock);
```

In practice, tests only need `TestClock` and `Random.withSeed`.

Sources: [default services](https://effect.website/docs/v4/requirements-management/default-services), [fiberref.md](https://github.com/Effect-TS/effect/blob/main/migration/fiberref.md)
