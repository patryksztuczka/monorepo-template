# 10 · Runtimes and entry points

An **entry point** is a file that starts a process and owns the Effect runtime. It is where the layer graph meets the outside world, and nothing imports it. Everything else is library code.

| Kind            | Path                           | Contains                                             |
| --------------- | ------------------------------ | ---------------------------------------------------- |
| Server / worker | `apps/<app>/src/index.ts`      | `Layer.launch(AppLayer).pipe(NodeRuntime.runMain)`   |
| Scheduled job   | `apps/<app>/src/jobs/<job>.ts` | compute the period, `Service.run(period)`, `runMain` |
| Runtime bridge  | `apps/<app>/src/runtime.ts`    | the one `ManagedRuntime.make(AppLayer)`              |
| Test bootstrap  | `**/vitest.global-setup.ts`    | one `ManagedRuntime` for test infrastructure         |

## Rules

### runtime.main: `Layer.launch` + `runMain`

```ts
// apps/api/src/index.ts
import { NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";
import { AppLayer } from "./layers.ts";

Layer.launch(AppLayer).pipe(NodeRuntime.runMain);
```

`runMain` turns SIGINT and SIGTERM into interruption, so every finalizer runs.

### runtime.embed: one `ManagedRuntime` for non-Effect hosts

When a framework or a callback that isn't Effect has to call into Effect, it goes through a single module-level runtime.

```ts
// good: apps/api/src/runtime.ts
export const runtime = ManagedRuntime.make(AppLayer);

// Hono route handler
app.post("/orders", (c) => runtime.runPromise(placeOrder(c.req.raw)));

// bad: resources never disposed, lifetimes unclear
app.post("/orders", (c) => Effect.runPromise(placeOrder(c.req.raw).pipe(Effect.provide(AppLayer))));
```

### r2.entry.run and r3.entry.config: only allowlisted files start runtimes

`Effect.runPromise`, `runSync`, `runFork`, `runCallback`, `NodeRuntime.runMain` and `ManagedRuntime.make` may appear only in files matched by the allowlist of the `effect-style/run-only-in-entry-points` lint rule. Adding an entry point is a config change.

```jsonc
"effect-style/run-only-in-entry-points": ["error", {
  "allow": [
    "apps/*/src/index.ts",
    "apps/*/src/jobs/*.ts",
    "apps/*/src/runtime.ts",
    "**/vitest.global-setup.ts"
  ]
}]
```

Calling `runtime.runPromise(...)` on the existing runtime is allowed anywhere, because that is the bridge.

Route modules never run effects. They export route layers, and the entry point merges them.

```ts
// modules/order/order-routes.ts: exports a layer, runs nothing
export const OrderRoutes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const pricer = yield* OrderPricer;
    yield* router.add("POST", "/orders" /* handler */);
  }),
);

// layers.ts
export const AppLayer = Layer.mergeAll(OrderRoutes, PaymentRoutes, HttpServerLive).pipe(
  Layer.provide(Database.layerConfig),
);
```

The `HttpRouter` API names are illustrative; check `effect/unstable/http` when implementing.

### r2.entry.exempt: entry points follow every other rule

With `runMain` and `Config`, entry points need neither `console` nor `process.env`. Only scripts, tool config files and Vitest global setup files are exempt from the ambient-globals rules (see [13](13-lint-rules.md)).

Sources: [runtime.md](https://github.com/Effect-TS/effect/blob/main/migration/runtime.md), [ai-docs](https://github.com/Effect-TS/effect/tree/main/ai-docs)
