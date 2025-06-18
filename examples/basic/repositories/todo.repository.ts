import { Orb } from "@zenith/core";


@Orb()
export class TodoRepository {
    constructor() {
    }

    getTodos(): string[] {
        return ['todo1', 'todo2'];
    }
}