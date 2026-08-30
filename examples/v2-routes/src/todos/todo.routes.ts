import { get, NotFoundException, post, router } from "@zenith-framework/web";
import { z } from "zod";
import { createTodo, findTodo, listTodos } from "./todo.store";

const Todo = z.object({ id: z.number(), name: z.string() });

export default router('/todos', [
    get('/', {
        query: z.object({ search: z.string().optional() }),
        response: z.object({ todos: z.array(Todo) }),
    }, ({ query }) => {
        //  ^? { search?: string } — validated before the handler runs
        return { todos: listTodos(query.search) };
    }),

    get('/:id', { response: Todo }, ({ params }) => {
        //                             ^? { id: string } — read off the path literal
        const todo = findTodo(Number(params.id));
        if (!todo) {
            throw new NotFoundException(`No todo ${params.id}`);
        }
        return todo;
    }),

    post('/', {
        body: z.object({ name: z.string().min(1) }),
        response: Todo,
    }, ({ body }) => createTodo(body.name)),

    // No schemas at all, for the trivial case.
    get('/meta/count', () => ({ count: listTodos().length })),
]);
