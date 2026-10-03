# 13 · Lint rules

The rules below make this guide enforceable with oxlint.

- **Built-in** rules need configuration only.
- **`effect-style/*`** rules live in the JS plugin at [`tools/oxlint/effect-style/`](../../tools/oxlint/effect-style/README.md), laid out like [anti-slop](https://github.com/dmmulroy/anti-slop): one file per rule, a co-located `RuleTester` test (`pnpm test:lint-rules`), and no build step. The plugin README lists every rule's options.
- **`anti-slop*`** rules come from the copy vendored at `tools/oxlint/anti-slop/`.

Constraints: oxlint JS plugins are alpha and cannot use TypeScript type information. Every custom rule works on syntax plus import resolution (`import { Effect } from "effect"`, including aliases and namespace imports). Oxlint has no `no-restricted-syntax`.

## Built-in

| Rule                                                                | Enforces                                                                                                                                         | Guide          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `eslint/no-console`                                                 | no `console.*`                                                                                                                                   | 01             |
| `eslint/no-restricted-globals`                                      | no `setTimeout`, `setInterval`, `setImmediate`                                                                                                   | 01, 03         |
| `eslint/no-restricted-properties`                                   | no `Date.now`, `DateTime.nowUnsafe`, `Math.random`, `process.env`, `JSON.parse`, `Promise.all/allSettled/race/any`, or any `globalThis.x` access | 01, 06, 07, 09 |
| `eslint/no-restricted-imports`                                      | no `@effect/schema`, other apps' `src/`, `env` from `node:process`, or `testcontainers` / `@testcontainers/*` outside the test-database helper   | 05, 07, 12     |
| `typescript/consistent-type-assertions` (`assertionStyle: "never"`) | no `as` (`as const` allowed)                                                                                                                     | 06             |
| `vitest/no-restricted-vi-methods`                                   | no `useFakeTimers` / `setSystemTime`                                                                                                             | 01, 11         |

## Custom: `effect-style`

| Rule                         | Flags                                                                                                                                                   | Guide      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `no-ambient-date`            | `new Date()` / `Date()` without arguments                                                                                                               | 01         |
| `no-throw-in-effect`         | `throw` inside `Effect.gen` / `Effect.fn` generators                                                                                                    | 02         |
| `no-throw`                   | any other `throw`, unless a library calls the function and a `// THROW: …` comment sits directly above; `Result` / `Option` `getOrThrow*` outside tests | 02         |
| `try-requires-catch`         | `Effect.try` / `tryPromise` without `{ try, catch }`                                                                                                    | 02         |
| `tagged-error-naming`        | error class without the `Error` suffix, with a tag that differs from its name, or outside `<module>-errors.ts`                                          | 02         |
| `no-untyped-failure`         | `Effect.fail("…")`, `Effect.fail(new Error(…))`                                                                                                         | 02         |
| `no-error-instanceof`        | `instanceof` a class whose name ends in `Error`                                                                                                         | 02         |
| `no-error-subclass`          | `class X extends Error` (or another built-in `*Error`)                                                                                                  | 02, 11     |
| `retry-requires-while`       | `Effect.retry` without `while` / `until`                                                                                                                | 03         |
| `service-explicit-shape`     | `Context.Service<Self>()` without a shape type argument                                                                                                 | 04         |
| `layer-naming`               | layers not named `layer` / `layer<Suffix>` (e.g. `FooLive`, `Default`)                                                                                  | 04         |
| `layer-config-only-in-roots` | `.layerConfig` outside composition roots                                                                                                                | 04, 07, 12 |
| `service-id-matches-path`    | service id not equal to `@example/<path below src>/<Service>` (autofix)                                                                                 | 05         |
| `no-decode-sync`             | `Schema.decodeUnknownSync` / `decodeSync` / `decodeUnknownPromise` outside scripts and tests                                                            | 06         |
| `branded-ids`                | `*Id` fields typed `Schema.String` / `Schema.Number`                                                                                                    | 06         |
| `redacted-secrets`           | secret-looking keys read with `Config.String`                                                                                                           | 07         |
| `effect-fn-name`             | `Effect.fn` without a literal `<Service>.<method>` name (autofix)                                                                                       | 08         |
| `log-literal-message`        | non-literal first argument to `Effect.log*`                                                                                                             | 08         |
| `bounded-concurrency`        | `"unbounded"` outside `Effect.all([...])`, or numeric literal concurrency                                                                               | 09         |
| `no-new-promise`             | `new Promise(…)`                                                                                                                                        | 09         |
| `fork-detach-reason`         | `Effect.forkDetach` without a `// DETACH: …` comment                                                                                                    | 09         |
| `run-only-in-entry-points`   | `Effect.run*`, `NodeRuntime.runMain`, `ManagedRuntime.make` outside the `allow` globs                                                                   | 10, 11     |
| `no-try-in-tests`            | `try` in `*.test.ts`                                                                                                                                    | 11         |

## From anti-slop

| Rule                                              | Flags                                                                          | Guide  |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| `anti-slop/no-module-mocking`                     | `vi.mock` / `vi.doMock`                                                        | 11, 12 |
| `anti-slop-effect/no-service-constructor-imports` | importing a `make<Service>` constructor into runtime code instead of its layer | 04     |

## Dropped

- `no-schema-class-methods`: rejected. Methods on `Schema.Class` records are allowed.
- `module-boundaries` (deep imports into another module): not carried over; it encoded one project's bounded-context layout rather than an Effect rule.

## Rollout status

Every `effect-style` rule is enabled at `error` for all files in `.oxlintrc.json`. Rule defaults follow this template's layout: kebab-case files, modules under `apps/*/src/modules/`, entry points `index.ts` / `runtime.ts`, the composition root in `apps/*/src/layers.ts`, and service ids `@example/<path>/<Service>` (`idSource: "class"`, because files are named in kebab-case, not after their service). Rename the `@example` prefix together with the workspace scope.

The built-in rules above are recommended but not switched on yet: `apps/api` still uses `console` and `process.env` directly.
