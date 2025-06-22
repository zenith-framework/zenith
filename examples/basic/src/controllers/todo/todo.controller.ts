import { Body, Controller, Get, Post, Query, RouteParam, Validated } from "@zenith-framework/web";
import { TodoService } from "../../services/todo.service";
import { z } from "zod";

const CreateTodoDto = z.object({
    name: z.string(),
});

@Validated()
@Controller('/todos')
export default class TodoController {
    constructor(
        private readonly todoService: TodoService
    ) {
    }

    @Get('/')
    getTodos(@Query('content') content: string) {
        return { todo: this.todoService.getTodos() };
    }

    @Get('/:id')
    getTodo(@RouteParam('id') id: string, otherId: string) {
        return { todo: this.todoService.getTodos() };
    }

    @Validated(CreateTodoDto)
    @Post('/')
    createTodo(@Body() body: z.infer<typeof CreateTodoDto>) {
        return { todo: this.todoService.storeTodo(body.name) };
    }
}

export const test = 'test';  