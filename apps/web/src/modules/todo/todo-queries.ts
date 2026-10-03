import type { CreateTodoInput } from "@example/shared/todo";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { Effect } from "effect";
import { ApiClient } from "../../lib/api-client";
import { runtime } from "../../runtime";

export const todoListQuery = queryOptions({
  queryKey: ["todos"],
  queryFn: () => runtime.runPromise(Effect.flatMap(ApiClient, (api) => api.todos.list())),
});

export const createTodoMutation = mutationOptions({
  mutationFn: (payload: CreateTodoInput) =>
    runtime.runPromise(Effect.flatMap(ApiClient, (api) => api.todos.create({ payload }))),
});
