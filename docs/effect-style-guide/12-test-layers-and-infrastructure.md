# 12 · Test layers and infrastructure

Swapping a layer is the most powerful testing tool Effect gives us. Code above the infrastructure is tested with scenario mocks. The infrastructure itself is tested against the real thing, and a test must never be able to reach a real database.

## Rules

### tl.doubles and r2.example.statics: `layerNoDeps` + `Layer.mock` scenarios

Tests compose `Service.layerNoDeps` with `Layer.mock` scenarios defined in the test file. Methods left out of a mock **die** with `UnimplementedError` if called, so a mock only needs what the scenario uses. A `layerTest` static on the service class exists only when several test files share the same default.

```ts
// good: the scenario is visible in the test file
const CatalogDown = Layer.mock(ProductCatalog, {
  offersFor: () => Effect.fail(new InventoryUnavailableError({ reason: "timeout" })),
});

// bad: bypasses dependency injection and breaks silently on renames
vi.mock("../product/product-catalog.ts", () => ({/* ... */}));
```

### tl.infra and r2.testdb.lifecycle: one real Postgres per test run

Infrastructure layers (repositories, SQL) are tested against a real Postgres started by testcontainers. There is **one container per test run**, never one per test or per file.

### r3.container: the container is an Effect service

The test container is a service with a scoped layer, so starting and stopping it goes through `acquireRelease`. Vitest's `globalSetup` is a host that doesn't run Effect, so, like any other such host, it builds the layer through one `ManagedRuntime` and disposes it on teardown.

```ts
// test/test-postgres.ts
export class TestPostgresStartError extends Schema.TaggedError<TestPostgresStartError>()(
  "TestPostgresStartError",
  { cause: Schema.Defect() },
) {}

export class TestPostgres extends Context.Service<
  TestPostgres,
  {
    readonly adminUri: string; // points at the migrated app_template
  }
>()("@example/test/TestPostgres") {
  static readonly layer = Layer.effect(
    TestPostgres,
    Effect.gen(function* () {
      const container = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () =>
            new PostgreSqlContainer("postgres:18-alpine").withDatabase("app_template").start(),
          catch: (cause) => new TestPostgresStartError({ cause }),
        }),
        (c) => Effect.promise(() => c.stop()),
      );
      const adminUri = container.getConnectionUri();
      yield* runMigrations(adminUri);
      return TestPostgres.of({ adminUri });
    }).pipe(Effect.withSpan("TestPostgres.start")),
  );
}
```

```ts
// vitest.global-setup.ts
import type { TestProject } from "vitest/node";
import { Effect, ManagedRuntime } from "effect";
import { TestPostgres } from "./test/test-postgres.ts";

const runtime = ManagedRuntime.make(TestPostgres.layer);

export default async function setup(project: TestProject) {
  const { adminUri } = await runtime.runPromise(TestPostgres.use(Effect.succeed));
  project.provide("pgAdminUri", adminUri);
  return () => runtime.dispose(); // the scope closes and the container stops
}

declare module "vitest" {
  export interface ProvidedContext {
    pgAdminUri: string;
  }
}
```

### r2.testdb.isolation: one database per test file

Each integration test file gets its own database, cloned from the migrated template and dropped when the suite ends. Files run in parallel, and the code under test can commit, use pools and `NOTIFY`. Postgres needs the template to have no open connections while it copies, so clones are created one at a time.

```ts
// test/pg-test.ts
export const layer = Layer.unwrap(
  Effect.gen(function* () {
    const adminUri = inject("pgAdminUri");
    const name = "test_" + (yield* Random.nextIntBetween(0, 1e9));
    yield* Effect.acquireRelease(createFromTemplate(adminUri, name, "app_template"), () =>
      dropDatabase(adminUri, name),
    );
    return Database.layer({ url: withDatabase(adminUri, name), maxConnections: 2 });
  }),
);

// modules/product/tests/product-integration.test.ts
layer(ProductCatalog.layer.pipe(Layer.provide(PgTest.layer)))("ProductCatalog", (it) => {
  /* ... */
});
```

### r2.testdb.safety: defence in depth

A test must never reach a development or production database. That would take three independent failures:

1. **Structural.** Database URLs come only from `inject("pgAdminUri")`. Tests use `Database.layer(options)` and never `layerConfig`, which a lint rule enforces.
2. **Empty environment.** Suites run with an empty config provider, so a stray `Config.string("DATABASE_URL")` fails with `ConfigError`.
3. **Guard.** `PgTest` refuses any host that isn't local.

```ts
export const NoEnv = ConfigProvider.layer(ConfigProvider.fromUnknown({}));

const assertLocal = (url: URL) =>
  url.hostname === "localhost" || url.hostname === "127.0.0.1"
    ? Effect.void
    : Effect.die("refusing to run tests against " + url.hostname);
```

The empty provider does not catch `Config.withDefault` or `Config.option`, and it cannot see direct `process.env` reads. The lint rules cover those.

### tl.config: application config in tests

Prefer `Service.layer(options)` with plain values. When a test must go through `layerConfig`, provide `ConfigProvider.layer(ConfigProvider.fromUnknown({ … }))`. Never mutate `process.env`.

Sources: [Layer.ts](https://github.com/Effect-TS/effect/blob/main/packages/effect/src/Layer.ts), [Vitest globalSetup](https://vitest.dev/config/globalsetup), [Vitest provide](https://vitest.dev/config/provide), [testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/), [PostgreSQL template databases](https://www.postgresql.org/docs/current/manage-ag-templatedbs.html)
