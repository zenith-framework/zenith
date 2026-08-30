/** Plain module state. No @Orb, no container, no constructor. */
const todos = new Map<number, { id: number, name: string }>([
    [1, { id: 1, name: 'compare the two route styles' }],
]);
let nextId = 2;

export const listTodos = (search?: string) =>
    [...todos.values()].filter(todo => !search || todo.name.includes(search));

export const findTodo = (id: number) => todos.get(id);

export const createTodo = (name: string) => {
    const todo = { id: nextId++, name };
    todos.set(todo.id, todo);
    return todo;
};
