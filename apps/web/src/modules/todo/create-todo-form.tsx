import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { CreateTodoInput } from "@example/shared/todo";
import { Button, Input } from "@example/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { createTodoMutation, todoListQuery } from "./todo-queries";

export function CreateTodoForm() {
  const queryClient = useQueryClient();

  const form = useForm<CreateTodoInput>({
    resolver: standardSchemaResolver(CreateTodoInput),
    defaultValues: { title: "" },
  });

  const createTodo = useMutation({
    ...createTodoMutation,
    onSuccess: () => {
      form.reset();
      return queryClient.invalidateQueries({ queryKey: todoListQuery.queryKey });
    },
  });

  const titleError = form.formState.errors.title;

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={form.handleSubmit((values) => createTodo.mutate(values))}
    >
      <div className="flex gap-2">
        <Input
          {...form.register("title")}
          placeholder="add a todo…"
          aria-invalid={titleError !== undefined}
          className="flex-1"
        />
        <Button type="submit" disabled={createTodo.isPending}>
          {createTodo.isPending ? "adding…" : "add"}
        </Button>
      </div>
      {titleError && <p className="text-xs text-red-400">{titleError.message}</p>}
    </form>
  );
}
