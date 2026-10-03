import { AppApi } from "@example/shared/api";
import { Context, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";

/** Typed client for the api Worker, derived from the shared `AppApi` contract. */
export class ApiClient extends Context.Service<ApiClient, HttpApiClient.ForApi<typeof AppApi>>()(
  "@example/lib/ApiClient",
) {
  // Same origin: in dev, vite proxies /api to the Worker.
  static readonly layer = Layer.effect(
    ApiClient,
    HttpApiClient.make(AppApi, { baseUrl: window.location.origin }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
}
