import { Schema } from "effect";

export const TodoId = Schema.Int.pipe(Schema.brand("TodoId"));
export type TodoId = typeof TodoId.Type;

export class Todo extends Schema.Class<Todo>("Todo")({
  id: TodoId,
  title: Schema.String,
  done: Schema.Boolean,
  createdAt: Schema.DateTimeUtc,
}) {}

// Standard Schema (standardschema.dev) wrapper: still an Effect Schema, so the
// same value is the HttpApi payload on the server and the react-hook-form
// resolver on the client.
export const CreateTodoInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    title: Schema.NonEmptyString,
  }),
);
export type CreateTodoInput = typeof CreateTodoInput.Type;
