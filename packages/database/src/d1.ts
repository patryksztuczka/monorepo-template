import * as Cloudflare from "alchemy/Cloudflare";

// Resolved from this file, not the working directory, so `alchemy dev` (run in
// apps/infra) and Vitest (run in the repo root) find the same folder. Only the
// plan phase reads migrations; Alchemy's bundler folds `__ALCHEMY_RUNTIME__`
// to `true`, which drops this path from the Worker bundle.
// oxlint-disable-next-line no-underscore-dangle -- global defined by Alchemy
const migrations = globalThis.__ALCHEMY_RUNTIME__ ? "" : `${import.meta.dirname}/../drizzle`;

/**
 * The app's D1 database, as an Alchemy resource. The api Worker binds it, and
 * the stack in apps/infra deploys it. Alchemy applies the drizzle-kit
 * migrations from `../drizzle` on every `alchemy dev` / `alchemy deploy`;
 * already-applied migrations are skipped.
 */
export const D1Database = Cloudflare.D1.Database("Database", { migrations });
