# Effect as the backend core, pinned with its ecosystem

The api is built on Effect 4 (services, layers, `HttpApi`) with the native Drizzle-on-Effect driver (`drizzle-orm/effect-d1` over `@effect/sql-d1`), so query builders are directly yieldable Effects with typed error channels. Effect is on the stable `4.0.0`, but Drizzle 1.0 and Alchemy are still prereleases built against it, so `effect`, `@effect/*`, `drizzle-orm`/`drizzle-kit` and `alchemy` are pinned together in the pnpm catalog and only ever upgraded as a unit.

## Consequences

- `drizzle-orm` is pinned to the exact build Alchemy's `alchemy/Drizzle` integration declares as its peer.
- Every package that resolves `drizzle-orm` must see the same `@cloudflare/workers-types` version, otherwise pnpm installs two drizzle copies whose types do not mix.
