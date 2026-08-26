import { Controller, Get } from "@zenith-framework/web";
import { TodoRepository } from "./db/todo.repository";

@Controller('/todos')
export class TodoController {
    constructor(private readonly todoRepository: TodoRepository) { }

    @Get('/')
    getTodos() {
        return { todos: this.todoRepository.findAll() };
    }
}
