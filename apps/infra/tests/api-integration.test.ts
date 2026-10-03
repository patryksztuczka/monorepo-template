import { expect } from "@effect/vitest";
import { AppApi } from "@example/shared/api";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Test from "alchemy/Test/Vitest";
import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import Stack from "../alchemy.run.ts";

// Deploys the real stack in local dev mode (workerd + a local D1 with the
// drizzle migrations applied), so no Cloudflare account is needed.
const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
  providers: Cloudflare.providers(),
  state: Alchemy.localState(),
  dev: true,
});

const stack = beforeAll(deploy(Stack));
afterAll(destroy(Stack));

const client = Effect.gen(function* () {
  const { url } = yield* stack;
  return yield* HttpApiClient.make(AppApi, { baseUrl: url });
}).pipe(Effect.provide(FetchHttpClient.layer));

test(
  "reports health",
  Effect.gen(function* () {
    const api = yield* client;
    expect(yield* api.health.check()).toEqual({ status: "ok" });
  }),
);

test(
  "creates todos and lists them newest first",
  Effect.gen(function* () {
    const api = yield* client;
    const older = yield* api.todos.create({ payload: { title: "older" } });
    const newer = yield* api.todos.create({ payload: { title: "newer" } });
    expect(newer.done).toBe(false);

    const ids = (yield* api.todos.list()).map((todo) => todo.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  }),
);

// The typed client validates payloads before sending, so this goes around it
// to check that the Worker validates too.
test(
  "rejects an empty title",
  Effect.gen(function* () {
    const { url } = yield* stack;
    const response = yield* HttpClient.execute(
      HttpClientRequest.post(`${url}/api/todos`).pipe(
        HttpClientRequest.bodyJsonUnsafe({ title: "" }),
      ),
    );
    expect(response.status).toBe(400);
  }).pipe(Effect.provide(FetchHttpClient.layer)),
);
