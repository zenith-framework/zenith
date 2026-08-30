import { Controller, Get } from "@zenith-framework/web";

@Controller('/')
export class TodoController {
    @Get('/public/health')
    health() {
        return { status: 'ok' };
    }

    @Get('/todos')
    getTodos() {
        return { todos: ['read the middleware example'] };
    }
}
