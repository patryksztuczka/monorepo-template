import { Database } from "@example/database";
import { D1Database } from "@example/database/d1";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle/D1";
import { Effect, Layer } from "effect";
import { Etag, HttpPlatform, HttpRouter } from "effect/http";
import { AppLayer } from "./layers.ts";

/**
 * The api Worker. The generator runs at deploy time (to register bindings)
 * and at cold start; `fetch` runs per request.
 */
export default class Api extends Cloudflare.Worker<Api>()(
  "Api",
  {
    main: import.meta.url,
    // apps/web proxies /api here during `pnpm dev`
    dev: { port: 3000 },
  },
  Effect.gen(function* () {
    const d1 = yield* Cloudflare.D1.QueryDatabase(D1Database);
    const db = yield* Drizzle.D1(d1);

    return {
      fetch: AppLayer.pipe(
        Layer.provide(Layer.succeed(Database, db)),
        Layer.provide([HttpPlatform.layer, Etag.layer]),
        HttpRouter.toHttpEffect,
      ),
    };
  }).pipe(Effect.provide(Cloudflare.D1.QueryDatabaseBinding)),
) {}
