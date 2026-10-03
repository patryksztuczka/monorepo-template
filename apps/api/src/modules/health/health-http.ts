import { AppApi } from "@example/shared/api";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

export const HealthHttpLayer = HttpApiBuilder.group(AppApi, "health", (handlers) =>
  handlers.handle("check", () => Effect.succeed({ status: "ok" as const })),
);
