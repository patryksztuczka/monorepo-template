# example-monorepo-template

pnpm workspace monorepo built on the [Vite+](https://viteplus.dev) toolchain (`vp`).

## Stack

- **Toolchain**: Vite+ (`vp` — dev server, build, Vitest 4, Oxlint, Oxfmt, task runner with caching)
- **Package manager**: pnpm (workspace + catalog for version pinning)
- **Runtime**: Node 26 (runs TypeScript directly via native type stripping — no build step for the API)
- **TypeScript**: 7.x (native compiler)
- **`apps/web`**: React 19 + Tailwind CSS 4 + Effect `HttpApiClient` + TanStack Query + react-hook-form
- **`apps/api`**: Cloudflare Worker + Effect 4 `HttpApi` + Drizzle ORM, deployed with [Alchemy](https://alchemy.run)
- **Database**: Cloudflare D1 (SQLite); `alchemy dev` runs it locally

## Layout

```
apps/
  web/            # React + Tailwind, served by vp dev (port 5173, proxies /api → :3000)
  api/            # Cloudflare Worker: HttpApi handlers + services (port 3000 under alchemy dev)
  infra/          # Alchemy stack (alchemy.run.ts): composes and deploys the Worker and D1
packages/
  database/       # @example/database — drizzle schema (SQLite), migrations, D1 resource, Database service
  shared/         # @example/shared — the HttpApi contract and domain schemas shared by api and web
  ui/             # @example/ui — shared React components (raw .tsx source)
docs/adr/         # architecture decision records
CONTEXT-MAP.md    # domain contexts and where each module's CONTEXT.md lives
vite.config.ts    # root Vite+ config; imports .oxfmtrc.json / .oxlintrc.json
.oxfmtrc.json     # formatting (single source of truth, also used by editors)
.oxlintrc.json    # linting (single source of truth, also used by editors)
```

## Getting started

```sh
pnpm install
pnpm dev               # start web + api in parallel
```

`pnpm dev` runs `alchemy dev` in `apps/infra`: the api Worker runs locally in `workerd` with a local D1 database, and the migrations from `packages/database/drizzle` are applied on start. No Cloudflare account is needed. Local state and data live in `apps/infra/.alchemy/`.

Open http://localhost:5173 — the page shows live API status and a todo list backed by the api Worker.

## Deploying

```sh
pnpm --filter @example/infra exec alchemy profile edit --add Cloudflare   # once: log in
pnpm run plan          # preview what deploy would change
pnpm run deploy        # create or update the D1 database and the Worker
pnpm run destroy       # delete them
```

Use `pnpm run deploy`, not `pnpm deploy`: `deploy` is a built-in pnpm command. In CI, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` instead of a profile (see [Environment](#environment)). Each developer deploys to their own stage (`dev_$USER`); pass `--stage prod` for production. Stack state is stored locally in `.alchemy/` — switch `state` in `apps/infra/alchemy.run.ts` to `Cloudflare.state()` before sharing a stage with a team or CI.

## Environment

Environment variables are declared in [`.env.schema`](./.env.schema) with [varlock](https://varlock.dev) (`@env-spec` decorators: type, sensitivity, whether required). It holds no values: put local ones in `.env.local` (gitignored), and set them as real environment variables in CI.

- `pnpm env:check` (`varlock load`) validates the resolved environment against the schema; `pnpm check` runs it first.
- The infra scripts (`plan`, `deploy`, `destroy`, `logs`) run through `varlock run`, which validates and injects the values into Alchemy and redacts sensitive ones in its output. Run anything else the same way: `pnpm exec varlock run -- <cmd>`.
- Add every new variable to `.env.schema` first, marking secrets `@sensitive` (the default here); never read `.env.local` directly.

`pnpm dev` and the tests need no variables.

## Agent fence

A commit lands only if it passes the checks: `lefthook.yml` runs `pnpm check`, `pnpm typecheck` and `pnpm test` on pre-commit (about 10 s). `pnpm install` installs the hook (the root `prepare` script runs `lefthook install`).

Coding agents cannot skip it. Each agent's shell hook runs one shared rule, [`scripts/vcs-command-policy.ts`](./scripts/vcs-command-policy.ts), which refuses any `git` command that bypasses hooks: `--no-verify`, `git commit -n`, `LEFTHOOK=0`, or a `core.hooksPath` override. The agent is told to fix what the hook reported, or to ask.

| Agent       | Wiring                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Claude Code | `.claude/settings.json` → `PreToolUse` on `Bash`                                                  |
| Codex       | `.codex/hooks.json` → `PreToolUse` on `Bash` (trust the project and its hooks once, via `/hooks`) |
| Cursor      | `.cursor/hooks.json` → `beforeShellExecution` (fails closed)                                      |
| Pi          | `.pi/extensions/git-hook-guard/` → `tool_call` on `bash` (needs project trust)                    |

Claude Code, Codex and Cursor call [`scripts/hooks/block-git-hook-bypass.ts`](./scripts/hooks/block-git-hook-bypass.ts). It has no dependencies, so it works before `pnpm install`. The rule matches text, so a shell command that runs `git` and merely mentions one of the bypasses, e.g. in an `echo`, is refused too. People at a terminal are not affected. To change the rule, edit the policy and its tests; that shows up in review.

## Commands

| Command            | What it does                                      |
| ------------------ | ------------------------------------------------- |
| `pnpm dev`         | run all `dev` scripts in parallel (`vp run`)      |
| `pnpm build`       | build all packages (cached by `vp run`)           |
| `pnpm test`        | run Vitest across the workspace (`vp test`)       |
| `pnpm check`       | env check + format-check + lint (`vp check`)      |
| `pnpm typecheck`   | `tsc` in every package (cached by `vp run`)       |
| `pnpm lint`        | Oxlint (`vp lint`)                                |
| `pnpm fmt`         | Oxfmt (`vp fmt`)                                  |
| `pnpm env:check`   | validate the environment against `.env.schema`    |
| `pnpm db:generate` | generate a SQL migration from schema changes      |
| `pnpm run plan`    | preview changes to the Cloudflare stack (Alchemy) |
| `pnpm run deploy`  | deploy the stack to Cloudflare                    |
| `pnpm run destroy` | delete the deployed stack                         |

## Effect typechecking

`pnpm typecheck` runs `tsc` in every package. The root `prepare` script runs
`effect-tsgo patch --typescript` after installs, replacing the local compiler with
Effect's compatible build (`@effect/tsgo` 0.45.0). The Effect language-service
diagnostics in `tsconfig.base.json` then fail `tsc`, not just the editor: leaked
requirements, `any`/`unknown` in error or requirement channels, floating Effects,
`try`/`catch` and `new Promise` inside Effect code, and globals that have an Effect
service (`Date` → `Clock`/`DateTime`, `Math.random` → `Random`, `fetch` → `HttpClient`,
`console` → `Effect.log`, timers, `crypto.randomUUID`, Node built-ins). Keep
TypeScript's version compatible with `@effect/tsgo`.

For a real boundary, silence one line with a reason:
`// @effect-diagnostics-next-line <rule>:off -- why`.

For VS Code, install the TypeScript 7 extension and configure the workspace SDK
path as `./node_modules/typescript/bin`. Select that SDK and restart the
TypeScript server.

## Documentation

- [CONTEXT-MAP.md](./CONTEXT-MAP.md) — the domain contexts and where each one's `CONTEXT.md` (glossary of domain language) lives
- [docs/adr/](./docs/adr) — architecture decision records; read these before changing anything that looks unusual, it may be deliberate

## Notes

- **Ports**: the api Worker listens on `3000` under `alchemy dev` (set in `apps/api/src/index.ts`). If the port is taken, Alchemy picks the next free one and logs it; the web proxy still points at `3000`.
- **Effect v4**: `effect` 4.0.0 (`Context.Service` class keys, `Layer.effect`, `HttpApi`). Drizzle 1.0 and Alchemy 2 are prereleases built against it, so `effect`, `@effect/*`, `drizzle-orm`, `drizzle-kit`, and `alchemy` move together (see [ADR 0003](./docs/adr/0003-effect-as-the-backend-core-on-a-pinned-rc-train.md)).
- **API architecture**: `@example/shared/api` (the `AppApi` contract, an Effect `HttpApi`) → `apps/api/src/modules/*/*-http.ts` (handlers via `HttpApiBuilder.group`) → `modules/todo/todo-service.ts` (Effect service, with an in-memory `layerTest` next to it) → `@example/database` (drizzle schema + `Database` service; query builders are yieldable Effects over `drizzle-orm/effect-d1`). `src/layers.ts` composes the handlers and services; `src/index.ts` is the Worker, which provides `Database` from the D1 binding and serves the result with `HttpRouter.toHttpEffect`. `packages/database/src/d1.ts` declares the D1 resource (next to its migrations), and `apps/infra/alchemy.run.ts` composes it with the Worker into the deployed stack; infrastructure no app code touches (domains, DNS) belongs there too. The web app builds a typed client from the same contract (`apps/web/src/lib/api-client.ts`) and validates forms with the same `@example/shared` schemas.
- **Tests**: unit tests use `TodoService.layerTest`. `apps/infra/tests/api-integration.test.ts` deploys the whole stack locally with `alchemy/Test/Vitest` (workerd + D1, no account needed) and calls it through the typed client.
- **Lint/format config**: `.oxfmtrc.json` and `.oxlintrc.json` are the single source of truth. `vp fmt`/`vp lint`/`vp check` only read config from `vite.config.ts`, so the root config imports both files and passes them through. Note oxfmt uses Prettier-style keys (`printWidth`, `tabWidth`).
- **Versions**: all shared dependency versions live in the `catalog:` section of `pnpm-workspace.yaml`. `vitest`, `oxfmt`, `oxlint`, and the `vite` alias (`@voidzero-dev/vite-plus-core`) are pinned to the versions bundled by `vite-plus` (`pnpm exec vp toolchain`), and the `overrides` block keeps every package on that one Vite and Vitest — bump them together when upgrading (see [ADR 0001](./docs/adr/0001-vite-plus-as-the-single-toolchain.md)).
