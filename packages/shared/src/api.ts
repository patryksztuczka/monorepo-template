import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import { TodoApiGroup } from "./todo-api.ts";

export class HealthApiGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("check", "/health", {
    success: Schema.Struct({ status: Schema.Literal("ok") }),
  }),
) {}

/** The contract between `apps/api` (server) and `apps/web` (client). */
export class AppApi extends HttpApi.make("AppApi")
  .add(HealthApiGroup)
  .add(TodoApiGroup)
  .prefix("/api") {}
