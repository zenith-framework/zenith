import { Body, Controller, Get, Post, Query, RouteParam } from "@zenith-framework/web";
import { TodoService } from "../../services/todo.service";

@Controller('/todos')
export default class TodoController {
    constructor(
        private readonly todoService: TodoService
    ) {
    }

    @Get('/')
    getTodos(@Query('content') content: string) {
        console.log(content);
        return { todo: this.todoService.getTodos() };
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