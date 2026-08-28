import { Controller, Get } from "@zenith-framework/web";
import { TodoRepository } from "./db/todo.repository";

@Controller('/todos')
export class TodoController {
    constructor(private readonly todoRepository: TodoRepository) { }

    @Get('/')
    getTodos() {
        return { todos: this.todoRepository.findAll() };
    }

    /**
     * Stands in for a request that is still running when a SIGTERM arrives. Shutdown
     * waits for it to finish before the pool it depends on is closed.
     */
    @Get('/slow')
    async getTodosSlowly() {
        await Bun.sleep(500);
        return { todos: this.todoRepository.findAll() };
    }
}
