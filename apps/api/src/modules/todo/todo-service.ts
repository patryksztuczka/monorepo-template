import { Database, todos } from "@example/database";
import { type CreateTodoInput, Todo, TodoId } from "@example/shared/todo";
import { desc } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, DateTime, Effect, Layer, Schema } from "effect";

// A `todos` row as drizzle returns it (`created_at` as a `Date`), decoded into
// the shared `Todo`.
const TodoFromRow = Schema.Struct({
  ...Todo.fields,
  createdAt: Schema.DateTimeUtcFromDate,
}).pipe(Schema.decodeTo(Todo));
const decodeRow = Schema.decodeEffect(TodoFromRow);

export class TodoService extends Context.Service<
  TodoService,
  {
    readonly list: Effect.Effect<ReadonlyArray<Todo>, EffectDrizzleQueryError>;
    readonly create: (input: CreateTodoInput) => Effect.Effect<Todo, EffectDrizzleQueryError>;
  }
>()("@example/modules/todo/TodoService") {
  static readonly layer = Layer.effect(
    TodoService,
    Effect.gen(function* () {
      const db = yield* Database;

      // Rows come from our own schema, so a row that does not decode is a bug.
      const list = db
        .select()
        .from(todos)
        .orderBy(desc(todos.createdAt), desc(todos.id))
        .pipe(
          Effect.flatMap((rows) =>
            Effect.forEach(rows, (row) => decodeRow(row).pipe(Effect.orDie)),
          ),
          Effect.withSpan("TodoService.list"),
        );

      const create = Effect.fn("TodoService.create")(function* (input: CreateTodoInput) {
        const now = yield* DateTime.now;
        const [row] = yield* db
          .insert(todos)
          .values({ title: input.title, createdAt: DateTime.toDateUtc(now) })
          .returning();
        return yield* Effect.fromNullishOr(row).pipe(Effect.flatMap(decodeRow), Effect.orDie);
      });

      return TodoService.of({ list, create });
    }),
  );

  /** In-memory implementation for tests — no database required. */
  static readonly layerTest = Layer.sync(TodoService, () => {
    const store: Array<Todo> = [];
    let nextId = 1;
    return TodoService.of({
      list: Effect.sync(() => store.toReversed()),
      create: Effect.fn("TodoService.create")(function* (input: CreateTodoInput) {
        const todo = new Todo({
          id: TodoId.make(nextId++),
          title: input.title,
          done: false,
          createdAt: yield* DateTime.now,
        });
        store.push(todo);
        return todo;
      }),
    });
  });
}
