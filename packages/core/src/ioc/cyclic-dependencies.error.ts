export class CyclicDependencyError extends Error {
    constructor(public readonly path: string[]) {
        super(`Cyclic dependency detected: ${path.join(' -> ')}`);
    }
}