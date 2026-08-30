import type { BunRequest } from "bun";
import type { RouteMethod } from "../web/route";

/**
 * The part of a validation schema this layer uses.
 *
 * Declared structurally, like the Zod validator does, so it works across `zod` and
 * `zod/v4` — and so the output type stays inferable through `safeParse`.
 */
export interface Schema<T = unknown> {
    safeParse(data: unknown): { success: boolean, data?: T, error?: { message: string } };
}

type Infer<S> = S extends Schema<infer T> ? T : never;

/**
 * Pulls the `:param` names out of a path literal.
 *
 * This is why paths are declared in the module rather than encoded in the filename:
 * a string literal is visible to the compiler, so handlers get typed params without
 * anyone writing a schema for them.
 */
type PathParam<S extends string> =
    S extends `${string}:${infer P}/${infer Rest}` ? P | PathParam<`/${Rest}`>
    : S extends `${string}:${infer P}` ? P
    : never;

type PathParams<S extends string> = { [K in PathParam<S>]: string };

export interface RouteSchemas {
    /** Overrides the params inferred from the path, for coercion or extra rules. */
    params?: Schema;
    query?: Schema;
    body?: Schema;
    response?: Schema;
    /** Defaults to 201 for POST, 200 otherwise. */
    status?: number;
}

/** What a handler receives. Every field is already validated. */
export type RouteContext<P extends string, S extends RouteSchemas> = {
    request: BunRequest;
    params: S['params'] extends Schema ? Infer<S['params']> : PathParams<P>;
    query: S['query'] extends Schema ? Infer<S['query']> : Record<string, string>;
    body: S['body'] extends Schema ? Infer<S['body']> : undefined;
};

/** What a handler must return, checked against the response schema when there is one. */
export type RouteResult<S extends RouteSchemas> = S['response'] extends Schema ? Infer<S['response']> : unknown;

export interface RouteDefinition {
    method: RouteMethod;
    path: string;
    schemas: RouteSchemas;
    handler: (context: RouteContext<string, RouteSchemas>) => unknown;
}

function define<M extends RouteMethod>(method: M) {
    function route<P extends string, S extends RouteSchemas>(
        path: P,
        schemas: S,
        handler: (context: RouteContext<P, S>) => RouteResult<S> | Promise<RouteResult<S>>,
    ): RouteDefinition;
    function route<P extends string>(
        path: P,
        handler: (context: RouteContext<P, Record<string, never>>) => unknown,
    ): RouteDefinition;
    function route(path: string, schemasOrHandler: unknown, maybeHandler?: unknown): RouteDefinition {
        const hasSchemas = typeof schemasOrHandler !== 'function';
        return {
            method,
            path,
            schemas: (hasSchemas ? schemasOrHandler : {}) as RouteSchemas,
            handler: (hasSchemas ? maybeHandler : schemasOrHandler) as RouteDefinition['handler'],
        };
    }
    return route;
}

export const get = define('GET');
export const post = define('POST');
export const put = define('PUT');
export const patch = define('PATCH');
export const del = define('DELETE');

const ZENITH_ROUTER = Symbol.for('zenith.router');

export interface Router {
    readonly [ZENITH_ROUTER]: true;
    readonly prefix: string;
    readonly routes: readonly RouteDefinition[];
}

/** Groups routes under a shared prefix, so the path is not repeated per route. */
export function router(prefix: string, routes: RouteDefinition[]): Router {
    return { [ZENITH_ROUTER]: true, prefix, routes };
}

export function isRouter(value: unknown): value is Router {
    return typeof value === 'object' && value !== null && ZENITH_ROUTER in value;
}
