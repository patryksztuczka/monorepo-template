# 04 · Services and layers

Dependency injection is where Effect shapes the code most. A service is a named contract. A layer is one way of building it.

## Rules

### services.define: declare the shape explicitly

Use `Context.Service<Self, Shape>()(id)`. The contract is readable at the top of the file, and an implementation cannot widen its error type by accident. Build methods with `Effect.fn` and return them through `Service.of`.

```ts
import { Context, Effect, Layer } from "effect";

export class ProductCatalog extends Context.Service<
  ProductCatalog,
  {
    readonly offersFor: (
      line: OrderLine,
    ) => Effect.Effect<ReadonlyArray<Offer>, InventoryUnavailableError>;
  }
>()("@example/modules/product/ProductCatalog") {
  static readonly layerNoDeps = Layer.effect(
    ProductCatalog,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const offersFor = Effect.fn("ProductCatalog.offersFor")(function* (line: OrderLine) {
        /* ... */
      });
      return ProductCatalog.of({ offersFor });
    }),
  );
  static readonly layer = this.layerNoDeps;
}
```

Consumers use `yield* ProductCatalog`. v4 removed accessors (static proxy methods like `ProductCatalog.offersFor(...)`), and `Effect.Service` with its generated `.Default` layer is gone.

### services.layerNames: `layer` plus a descriptive suffix

| Name                  | Meaning                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| `Service.layer`       | the primary layer, with service dependencies wired                                     |
| `Service.layerNoDeps` | requirements left open, for composition and tests                                      |
| `Service.layerConfig` | reads `Config` (configurable services, see [07](07-configuration.md))                  |
| `Service.layerTest`   | only when several test files share it (see [12](12-test-layers-and-infrastructure.md)) |

Never `Live`, `Default` or `FooLive`.

### r3.wiring: `layer` wires services, not infrastructure

`Service.layer` provides the **services** it depends on, but leaves **infrastructure** (SqlClient, external clients) open. Composition roots (`AppLayer` and `JobLayer` in `apps/<app>/src/layers.ts`) provide infrastructure through `layerConfig`, exactly once.

```ts
// modules/order/order-pricer.ts
static readonly layer = this.layerNoDeps.pipe(
  Layer.provide(ProductCatalog.layer)         // service dependency: wired here
)                                              // R = SqlClient: infrastructure stays open

// layers.ts: the composition root
export const AppLayer = Layer.mergeAll(OrderPricer.layer, PaymentLedger.layer, HttpLive)
  .pipe(Layer.provide(Database.layerConfig))   // the only place env is read
```

Why:

- `.layer` never reads the environment, so it is safe to use in integration tests with a test database.
- Layers are memoized across provides, so providing `Database.layerConfig` once gives every service the same pool.

### Resources inside layers

`Layer.scoped` merged into `Layer.effect`, so `acquireRelease` works directly inside `Layer.effect`. See [09](09-concurrency-and-resources.md).

Sources: [services.md](https://github.com/Effect-TS/effect/blob/main/migration/services.md), [layer-memoization.md](https://github.com/Effect-TS/effect/blob/main/migration/layer-memoization.md), [v4 Layers docs](https://effect.website/docs/v4/requirements-management/layers)
