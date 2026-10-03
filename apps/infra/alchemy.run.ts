import Api from "@example/api/worker";
import { D1Database } from "@example/database/d1";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect } from "effect";

/**
 * The whole deployment: run `alchemy dev` / `deploy` / `destroy` from here.
 * Resources a Worker binds to are declared next to the code that uses them
 * (the Worker in apps/api, D1 in packages/database); this file composes them
 * and is the place for infrastructure no app code touches (zones, DNS, ...).
 */
export default Alchemy.Stack(
  "Example",
  {
    providers: Cloudflare.providers(),
    // Local state lives in `.alchemy/`. For a team, switch to
    // `Cloudflare.state()` so every machine and CI share one state store.
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const database = yield* D1Database;
    const api = yield* Api;

    return {
      url: api.url.as<string>(),
      databaseName: database.databaseName,
    };
  }),
);
