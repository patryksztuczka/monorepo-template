import { AppApi } from "@example/shared/api";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { TodoService } from "./todo-service.ts";

// Database failures are not part of the contract: they surface as a 500.
export const TodoHttpLayer = HttpApiBuilder.group(AppApi, "todos", (handlers) =>
  Effect.gen(function* () {
    const service = yield* TodoService;
    return handlers
      .handle("list", () => service.list.pipe(Effect.orDie))
      .handle("create", ({ payload }) => service.create(payload).pipe(Effect.orDie));
  }),
);
