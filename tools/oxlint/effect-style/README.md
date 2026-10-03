# effect-style

Oxlint JS plugin that enforces the Effect v4 style guide in [`docs/effect-style-guide`](../../../docs/effect-style-guide/README.md). Rule rationale, and the built-in and anti-slop rules adopted alongside these, are in [`13-lint-rules.md`](../../../docs/effect-style-guide/13-lint-rules.md).

Laid out like the vendored [anti-slop](../anti-slop) plugin:

- one file per rule in `rules/`, with a co-located `RuleTester` test;
- no build step, because oxlint loads `index.ts` directly;
- no type information, because oxlint JS plugins cannot use the TypeScript checker. Rules work on syntax plus import resolution: `Effect`, `Schema`, `Layer` and friends are recognised only when bound by an import from `effect`, `effect/*` or `@effect/*` (named, aliased or namespace), so a local `const Effect = …` is never flagged.

```sh
pnpm test:lint-rules                                 # RuleTester suites through node:test
pnpm exec tsc -p tools/oxlint/effect-style/tsconfig.json
```

## Enabling

The plugin is registered in `.oxlintrc.json` (`jsPlugins`) and every rule is switched on at `error`. The path-based defaults follow this template's layout (see [13](../../../docs/effect-style-guide/13-lint-rules.md#rollout-status)); override them per path in an `overrides` block if a package is laid out differently:

```jsonc
{
  "files": ["apps/worker/src/**/*.ts"],
  "rules": {
    "effect-style/run-only-in-entry-points": ["error", { "allow": ["apps/worker/src/main.ts"] }],
  },
}
```

## Rules

Every message names the style guide file that explains it. Rules marked _fix_ support `oxlint --fix`.

| Rule                         | Flags                                                                                                                                           | Options (default)                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `no-ambient-date`            | `new Date()` / `Date()` without arguments                                                                                                       |                                                                                               |
| `no-throw-in-effect`         | `throw` inside `Effect.gen` / `Effect.fn` / `Effect.fnUntraced` generators                                                                      |                                                                                               |
| `no-throw`                   | any other `throw`, except in a library callback with a `// THROW: …` comment directly above it; `Result` / `Option` `getOrThrow*` outside tests | `marker` (`"THROW:"`), `tests` (`**/*.test.ts`)                                               |
| `try-requires-catch`         | `Effect.try` / `tryPromise` without `{ try, catch }`                                                                                            |                                                                                               |
| `tagged-error-naming`        | error classes missing the `Error` suffix, with a tag that differs from the class name, or outside the errors file                               | `filePattern` (`"-errors\\.ts$"`, `""` disables)                                              |
| `no-untyped-failure`         | `Effect.fail` with a string or a built-in `Error`; `yield* new Error()`                                                                         |                                                                                               |
| `no-error-instanceof`        | `x instanceof C` where the name of `C` ends in `Error`                                                                                          |                                                                                               |
| `no-error-subclass`          | classes extending `Error` or another built-in `*Error`                                                                                          |                                                                                               |
| `retry-requires-while`       | `Effect.retry` / `retryOrElse` without `while` / `until`                                                                                        |                                                                                               |
| `service-explicit-shape`     | `Context.Service<Self>()` without a shape type argument                                                                                         |                                                                                               |
| `layer-naming`               | layers not named `layer` / `layer<Suffix>`                                                                                                      | `allowNames` (`AppLayer`, `JobLayer`, `^[A-Z]\w*Layer$`), `ignoreFiles` (`**/*.test.ts`)      |
| `layer-config-only-in-roots` | `.layerConfig` outside composition roots                                                                                                        | `allow` (`apps/*/src/layers.ts`, `apps/*/src/index.ts`, `apps/*/src/jobs/**`)                 |
| `service-id-matches-path`    | service id differs from `<prefix>/<path below sourceRoot>`; with `idSource: "file"`, class name differs from the file name. _fix_               | `prefix` (`@example`), `sourceRoot` (`apps/*/src`), `extraRoots` (`{}`), `idSource` (`class`) |
| `no-decode-sync`             | throwing `Schema` codecs (`decodeUnknownSync`, `encodeSync`, `*Promise`)                                                                        | `allow` (`scripts/**`, `**/*.test.ts`)                                                        |
| `branded-ids`                | `*Id` fields typed as a plain `Schema.String` / `Number` / `UUID` in Schema structs and classes                                                 | `keyPattern` (`"(^id\|Id)$"`)                                                                 |
| `redacted-secrets`           | secret-looking keys read with `Config.String` / `URL`                                                                                           | `secretPattern`                                                                               |
| `effect-fn-name`             | `Effect.fn` without a literal `<Service>.<method>` name. _fix_                                                                                  | `matchEnclosing` (`true`)                                                                     |
| `log-literal-message`        | non-constant first argument to `Effect.log*`                                                                                                    |                                                                                               |
| `bounded-concurrency`        | `concurrency: "unbounded"` outside `Effect.all([...])`, or a numeric literal                                                                    | `requireNamedConstant` (`true`)                                                               |
| `no-new-promise`             | `new Promise(…)`                                                                                                                                |                                                                                               |
| `fork-detach-reason`         | `Effect.forkDetach` / `forkDaemon` without a `// DETACH: …` comment                                                                             | `marker` (`"DETACH:"`)                                                                        |
| `run-only-in-entry-points`   | `Effect.run*`, `NodeRuntime.runMain`, `ManagedRuntime.make` outside the allowlist; a separate message in tests                                  | `allow`, `tests`                                                                              |
| `no-try-in-tests`            | `try` statements in test files                                                                                                                  | `tests` (`**/*.test.ts`)                                                                      |

`no-throw` counts a function as a library callback when it is an argument of a call that is not Effect API, or a method or property of an object literal passed to one, at any depth (`new Transform({ transform() { … } })`). Functions passed to Effect (`Effect.try({ try })`, `Effect.sync`) are not library callbacks. It also reports `getOrThrow` and `getOrThrowWith` from `Result` and `Option`, called or passed (`x.pipe(Result.getOrThrow)`), because they throw on a failure or a missing value; files matching `tests` may still use them as an assertion.

`idSource: "class"` (the default) is for a layout whose files are not named after their service, such as kebab-case files: the id becomes `<prefix>/<directory below sourceRoot>/<ServiceClass>`. `idSource: "file"` uses `<prefix>/<path below sourceRoot>` instead and also requires the class name to equal the file name.

## Limits

- `effect-fn-name` infers the expected name only inside a class extending `Context.Service` / `Effect.Service` / `Context.Tag`. Elsewhere it only requires a literal name.
- `no-untyped-failure` cannot see through variables that hold a string.
- `no-throw` knows Effect calls by their import only, so a callback handed to one of our own helpers counts as a library callback, and the `// THROW:` comment would let it throw.
- `no-error-instanceof` goes by name: a class not ending in `Error`, or one held in a variable, is not seen. `no-error-subclass` still reports the class if it extends a built-in error.
