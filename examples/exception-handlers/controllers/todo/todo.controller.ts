import { Controller, Get, RouteParam } from "@zenith-framework/web";

export class TodoNotFoundError extends Error {
    constructor() {
        super('Todo not found');
    }
}

@Controller('/todos')
export default class TodoController {
    @Get('/:id')
    getTodo(@RouteParam('id') id: string, otherId: string) {
        throw new TodoNotFoundError();
    }
}