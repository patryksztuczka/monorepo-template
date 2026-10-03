# 08 · Observability

When an order does not go through, someone has to be able to see why. Spans, structured logs and error reports come almost for free when every service method is traced by construction.

## Rules

### obs.spans: service methods are `Effect.fn`

`Effect.fn("Name")` creates a span for every call and captures a stack trace pointing at the call site. Use it for every service method and exported workflow. In tight inner loops, use `Effect.fnUntraced`.

```ts
// good
const price = Effect.fn("OrderPricer.price")(function* (line: OrderLine) {
  yield* Effect.annotateCurrentSpan({ "product.id": line.productId });
  // ...
});

// bad: no span, no stack trace
const price = (line: OrderLine) =>
  Effect.gen(function* () {
    /* ... */
  });
```

Extra arguments to `Effect.fn` act like `pipe`. Do not call `.pipe` on the resulting function.

### obs.names: span name is `<ServiceClass>.<method>`

```ts
Effect.fn("ProductCatalog.offersFor");
Effect.fn("PaymentLedger.record");
```

The name must be a string literal.

### obs.logs: constant message, structured fields

```ts
// good
yield * Effect.logInfo("Payment recorded", { customerId, orderId, amount });

// bad: cannot be grouped or filtered
yield * Effect.logInfo("Recorded payment for " + customerId + " on " + orderId);
```

Loggers are installed as a set, and the minimum level is a Reference:

```ts
Logger.layer([Logger.consoleJson, Logger.tracerLogger]);
Layer.succeed(References.MinimumLogLevel, "Info");
```

### obs.errors: the error tracker through the `ErrorReporter` layer

Errors reach the error tracker through v4's `ErrorReporter` layer. For Sentry, `@sentry/effect` registers it. HTTP and RPC servers report at their boundaries automatically, deduplicate reports and skip interrupts. There are no manual `captureException` calls.

```ts
// good (verify the exact @sentry/effect API when implementing)
export const Observability = Layer.mergeAll(
  Sentry.effectLayer({ dsn: Redacted.value(dsn) }),
  Logger.layer([Logger.consoleJson, Logger.tracerLogger]),
);

// bad: duplicates reports, misses defects, forgotten on new paths
effect.pipe(Effect.tapError((e) => Effect.sync(() => Sentry.captureException(e))));
```

## Metrics

Metrics are no longer callable. Use `Metric.update`, `Metric.withAttributes` and `Effect.trackDuration`.

Sources: [LLMS.md](https://github.com/Effect-TS/effect/blob/main/LLMS.md), [v3-to-v4.md](https://github.com/Effect-TS/effect/blob/main/migration/v3-to-v4.md), [@sentry/effect](https://www.npmjs.com/package/@sentry/effect)
