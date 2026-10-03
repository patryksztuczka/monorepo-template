import { AppApi } from "@example/shared/api";
import { Layer } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { HealthHttpLayer } from "./modules/health/health-http.ts";
import { TodoHttpLayer } from "./modules/todo/todo-http.ts";
import { TodoService } from "./modules/todo/todo-service.ts";

// Leaves `Database` open: the Worker provides it from the D1 binding.
export const AppLayer = HttpApiBuilder.layer(AppApi).pipe(
  Layer.provide([HealthHttpLayer, TodoHttpLayer]),
  Layer.provide(TodoService.layer),
);
