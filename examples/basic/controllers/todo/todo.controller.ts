import { Body, Controller, Get, Post, RouteParam } from "@zenith/web";
import { TodoService } from "../../services/todo.service";

@Controller('/todos')
export default class TodoController {
    constructor(
        private readonly todoService: TodoService
    ) {
    }

    @Get('/:id')
    getTodo(@RouteParam('id') id: string, otherId: string) {
        return { todo: this.todoService.getTodos() };
    }

    @Post('/:id')
    createTodo(@Body() body: { name: string }) {
        return { todo: this.todoService.storeTodo(body.name) };
    }
}

export const test = 'test';  