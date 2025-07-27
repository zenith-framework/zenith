import { Body, Controller, createZodDto, Get, OpenApiResponse, Post, Query, RouteParam } from "@zenith-framework/web";
import { z } from "zod/v4";

const Todo = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
});

class TodoDto extends createZodDto(Todo, { name: 'CustomTodoDto' }) { }
class TodoTypeDto extends createZodDto(z.enum(['todo', 'done'])) { }

@Controller('/todo')
export default class TodoController {
    @Get('/')
    @OpenApiResponse({ type: TodoDto })
    getTodos(@Query('type') type: TodoTypeDto) {
        return 'Hello World';
    }

    @Get('/:id')
    @OpenApiResponse({ type: TodoDto })
    getTodoById(@RouteParam('id') id: string) {
        return 'Hello World';
    }

    @Post('/')
    @OpenApiResponse({ type: TodoDto })
    createTodo(@Body() todo: TodoDto) {
        return 'Hello World';
    }
}