import { Orb } from "@zenith-framework/core";


@Orb()
export class TodoRepository {
    constructor() {
    }

    getTodos(): string[] {
        return ['todo1', 'todo2'];
    }
}