import { Orb } from "@zenith/core";
import { TodoRepository } from "../repositories/todo.repository";

@Orb
export class TodoService {
    private todos: string[] = [];
    constructor(private readonly todoRepository: TodoRepository) {
    }

    public getTodos() {
        return this.todoRepository.getTodos();
    }

    public storeTodo(name: string) {
        this.todos.push(name);
        return this.todos;
    }
}