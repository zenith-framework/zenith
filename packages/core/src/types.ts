/**
 * A class the container can construct.
 *
 * The constructor parameters stay `any[]` on purpose: a class with typed parameters
 * is not assignable to `new (...args: unknown[]) => T`, so narrowing them here would
 * reject every real orb. This is the one place the framework needs it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

/** An orb as it is handed to the container: a class to construct, or a ready-made value. */
export type OrbProvider<T = unknown> = Constructor<T> | T;

/** What a method or parameter decorator receives: the prototype carrying the member. */
export type DecoratorTarget = object;
