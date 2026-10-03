# Effect v4 style guide

How we write Effect code in this repository.

- **Target version:** `effect@4.0.0`, pinned in the `pnpm-workspace.yaml` catalog together with the Drizzle and Alchemy prereleases built against it.
- **Guiding principle:** failures, time and dependencies are visible in the types. Every rule here exists so a person or an agent can see why the code behaved as it did.
- **Services versus functions:** anything that needs a store, a database, a clock or a network is an Effect service; a module-level function is pure.

The rules follow the official v4 docs and migration guides. Each rule has an id such as `errors.naming`, so a review comment or a lint message can point at it.

## Topics

| #   | File                                                                   | Covers                                                            |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 01  | [Default services](01-default-services.md)                             | Clock, Random, Console, ConfigProvider, Tracer instead of globals |
| 02  | [Typed errors](02-typed-errors.md)                                     | `Schema.TaggedError`, naming, failures vs defects                 |
| 03  | [Retry and scheduling](03-retry-and-scheduling.md)                     | `Effect.retry`, `Schedule`, scheduled jobs                        |
| 04  | [Services and layers](04-services-and-layers.md)                       | `Context.Service`, layer naming and wiring                        |
| 05  | [Project structure](05-project-structure.md)                           | modules, files, imports, service ids                              |
| 06  | [Schema](06-schema.md)                                                 | domain records, branded ids, decoding, shared contracts           |
| 07  | [Configuration](07-configuration.md)                                   | `layer(options)` / `layerConfig`, secrets                         |
| 08  | [Observability](08-observability.md)                                   | spans, logs, error reporting                                      |
| 09  | [Concurrency and resources](09-concurrency-and-resources.md)           | bounded concurrency, scoped fibers, `acquireRelease`              |
| 10  | [Runtimes and entry points](10-runtimes-and-entry-points.md)           | `runMain`, `ManagedRuntime`, the entry-point allowlist            |
| 11  | [Testing](11-testing.md)                                               | `@effect/vitest`, seams, errors, time                             |
| 12  | [Test layers and infrastructure](12-test-layers-and-infrastructure.md) | mocks, test containers, test databases                            |
| 13  | [Lint rules](13-lint-rules.md)                                         | the oxlint rules that enforce this guide                          |

## v3 names you will not see here

| v3 or early v4 beta                                     | v4 RC                                           |
| ------------------------------------------------------- | ----------------------------------------------- |
| `Context.Tag`, `Effect.Service`, `ServiceMap.Service`   | `Context.Service`                               |
| `Layer.scoped`                                          | `Layer.effect`                                  |
| `.Default`, `FooLive`                                   | `Foo.layer`, `Foo.layerTest`                    |
| `Effect.catchAll`                                       | `Effect.catch`                                  |
| `Schema.TaggedErrorClass`                               | `Schema.TaggedError`                            |
| `Effect.fork`, `Effect.forkDaemon`                      | `Effect.forkChild`, `Effect.forkDetach`         |
| `Effect.withClock`, `Layer.setClock`, `DefaultServices` | `Effect.provideService(…, Clock.Clock, …)`      |
| `Schema.decodeUnknown`, `Schema.transform`              | `Schema.decodeUnknownEffect`, `Schema.decodeTo` |
| `Either`                                                | `Result`                                        |
| `it.scoped`                                             | `it.effect`                                     |

## Sources

- Effect 4.0 RC announcement: https://effect.website/blog/releases/effect/40-rc
- Migration guides: https://github.com/Effect-TS/effect/tree/main/migration
- LLMS.md: https://github.com/Effect-TS/effect/blob/main/LLMS.md
- v4 docs: https://effect.website/docs/v4/

## To verify during implementation

- `DateTime.formatIsoDate`, `DateTime.startOf`, `DateTime.subtract` on v4 (carried over from v3); the code does not use them yet.
- The examples in these files have not been type-checked against `4.0.0`.
