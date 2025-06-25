export class CyclicDependencyError extends Error {
    constructor(public readonly cycles: string[][]) {
        super(`Cyclic dependency detected: ${cycles.map(cycle => cycle.join(' -> ')).join(', ')}`);
    }
}