import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api";
import { CreateTodoInput, Todo } from "./todo.ts";

export class TodoApiGroup extends HttpApiGroup.make("todos")
  .add(
    HttpApiEndpoint.get("list", "/todos", {
      success: Schema.Array(Todo),
    }),
  )
  .add(
    HttpApiEndpoint.post("create", "/todos", {
      payload: CreateTodoInput,
      success: Todo.pipe(HttpApiSchema.status(201)),
    }),
  ) {}
