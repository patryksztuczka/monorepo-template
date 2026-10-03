# tRPC with a type-only export from the api

**Superseded by [0006](0006-effect-httpapi-contract-in-shared.md).**

The web app talked to the api through tRPC v11 (mounted on Hono at `/trpc`). For end-to-end types, `@example/api` exported its router as `"./trpc"` and the web app declared `@example/api` as a devDependency, importing only `type { AppRouter }` — server code never reached the client bundle. We chose this over a separate api-contract package because the router _was_ the contract; a duplicate would only drift.
