import type { D1Client } from "@effect/sql-d1/D1Client";
import type { EffectSQLiteD1Database } from "drizzle-orm/effect-d1";
import { Context } from "effect";

/**
 * Drizzle over Cloudflare D1. Query builders are yieldable Effects.
 *
 * The layer lives next to the D1 binding in `apps/api`, because only the
 * Worker can resolve the binding.
 */
export class Database extends Context.Service<
  Database,
  EffectSQLiteD1Database & { readonly $client: D1Client }
>()("@example/Database") {}
