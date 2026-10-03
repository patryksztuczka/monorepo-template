import { useQuery } from "@tanstack/react-query";
import { DateTime } from "effect";
import { todoListQuery } from "./todo-queries";

export function TodoList() {
  const todos = useQuery(todoListQuery);

  if (todos.isPending) {
    return <p className="text-sm text-zinc-500">loading…</p>;
  }
  if (todos.isError) {
    return <p className="text-sm text-red-400">failed to load todos</p>;
  }
  if (todos.data.length === 0) {
    return <p className="text-sm text-zinc-500">no todos yet</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {todos.data.map((todo) => (
        <li key={todo.id} className="flex items-baseline gap-2 text-sm text-zinc-300">
          <span className={todo.done ? "line-through opacity-50" : ""}>{todo.title}</span>
          <span className="ml-auto shrink-0 text-xs text-zinc-600">
            {DateTime.toDateUtc(todo.createdAt).toLocaleTimeString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
