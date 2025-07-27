import 'reflect-metadata';
import { Body, Controller, createZodDto, createZodEnumDto, Get, OpenApiResponse, Post, Query, RouteParam, Validated } from "@zenith-framework/web";
import { z } from "zod/v4";

const Todo = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
});

const TodoType = z.enum(['todo', 'done']);

class TodoDto extends createZodDto(Todo, { name: 'CustomTodoDto' }) { }
class TodoTypeDto extends createZodEnumDto(TodoType, { name: 'CustomTodoTypeDto' }) { }

@Controller('/todo')
export default class TodoController {
    @Get('/')
    @Validated()
    @OpenApiResponse({ type: TodoDto })
    getTodos(@Query('type') type?: TodoTypeDto) {
        if (type?.value === 'done') {
            return `Hello World with type ${type.value}`;
        }

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

    @Get('/test')
    getTodoTest() {
        return 'Hello World';
    }
}