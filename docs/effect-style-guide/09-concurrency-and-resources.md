# 09 · Concurrency and resources

Fibers are structured. A child cannot outlive its parent unless you say so, and interruption runs finalizers. We stay inside that structure.

## Rules

### conc.parallel: always a bounded, named concurrency

`Effect.all` and `Effect.forEach` are **sequential by default**. For concurrency, pass a number from a named constant. v4 removed the ambient concurrency setting.

```ts
// good
const PRICING_CONCURRENCY = 8;
yield * Effect.forEach(lines, pricer.price, { concurrency: PRICING_CONCURRENCY });

// bad: unbounded load on the product database
yield * Effect.forEach(lines, pricer.price, { concurrency: "unbounded" });

// bad: no interruption, no limit, loses context
await Promise.all(lines.map((l) => Effect.runPromise(price(l))));
```

### conc.background: background fibers belong to a scope

Use `Effect.forkScoped`, `FiberSet`, `FiberMap` or `FiberHandle`, so everything is interrupted on shutdown. `Effect.forkDetach` (the old `forkDaemon`) needs a comment explaining why.

```ts
static readonly layer = Layer.effect(this, Effect.gen(function*() {
  const inflight = yield* FiberSet.make()
  const submit = Effect.fn("Fulfilment.submit")(function*(order: Order) {
    yield* FiberSet.run(inflight, ship(order))
  })
  return Fulfilment.of({ submit })
}))
```

v4 renames: `Effect.fork` → `Effect.forkChild`, `Effect.forkDaemon` → `Effect.forkDetach`.

### conc.resources: `acquireRelease` inside a layer

Any resource with a close method is acquired with `Effect.acquireRelease` inside `Layer.effect`. The release runs on shutdown, at the end of a test and on failure.

```ts
// good
const pool =
  yield *
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => createPool(url),
      catch: () => new InventoryDbUnavailableError(),
    }),
    (pool) => Effect.promise(() => pool.end()),
  );

// bad: skipped on interruption
const pool = await createPool(url);
try {
  /* ... */
} finally {
  await pool.end();
}
```

## Notes

- In v4, `Ref`, `Deferred` and `Fiber` are not yieldable. Use `Ref.get`, `Deferred.await` and `Fiber.join`.
- `Semaphore` is its own module: `Semaphore.make(n)`, `Semaphore.withPermits(sem, 1)`.

Sources: [forking.md](https://github.com/Effect-TS/effect/blob/main/migration/forking.md), [v3-to-v4.md](https://github.com/Effect-TS/effect/blob/main/migration/v3-to-v4.md)
