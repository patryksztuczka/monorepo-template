# Effect HttpApi contract in `packages/shared`

The api contract is an Effect `HttpApi` (`AppApi` in `@example/shared/api`): endpoints, paths, payload, success and error schemas. The Worker implements it with `HttpApiBuilder.group`, and the web app derives a typed client from it with `HttpApiClient.make`. Both sides encode and decode with the same schemas, so a `Todo` arrives in the browser as a `Todo` instance with a real `Date`, not as JSON-shaped data.

This replaces tRPC ([0004](0004-trpc-with-a-type-only-export-from-the-api.md)). tRPC's contract was the server's router, so the web app had to depend on `@example/api`. With the contract in `shared`, the web app depends only on `shared`, the api is plain REST that any HTTP client can call, and the contract is the same Effect Schema the rest of the codebase already uses.

## Consequences

- The client validates payloads before sending, and the Worker validates them again on arrival.
- Database failures are not part of the contract. Handlers turn them into defects, which `HttpApi` answers with a 500.
