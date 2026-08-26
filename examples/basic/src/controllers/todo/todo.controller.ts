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
        const todos = this.todoService.getTodos();
        return { todos: content ? todos.filter(todo => todo.includes(content)) : todos };
    }

    @Get('/:id')
    getTodo(@RouteParam('id') id: string) {
        return { id, todo: this.todoService.getTodos()[Number(id)] };
    }

    @Validated(CreateTodoDto)
    @Post('/')
    createTodo(@Body() body: z.infer<typeof CreateTodoDto>) {
        return { todo: this.todoService.storeTodo(body.name) };
    }
}

export const test = 'test';  