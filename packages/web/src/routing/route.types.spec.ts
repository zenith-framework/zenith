import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { z } from 'zod';

import { get, post, router } from './route';

/**
 * These assertions are checked by `tsc --noEmit`, not at runtime: every `params`,
 * `query` and `body` annotation below fails to compile if inference regresses, and
 * every `@ts-expect-error` fails to compile if the type stops catching the mistake.
 *
 * The runtime expectations only confirm the definitions were built as described.
 */
const Todo = z.object({ id: z.number(), name: z.string() });

const routes = router('/todos', [
    get('/:id', { response: Todo }, ({ params }) => {
        const id: string = params.id;
        return { id: Number(id), name: 'x' };
    }),

    get('/orgs/:org/todos/:id', { response: Todo }, ({ params }) => {
        const compound: string = params.org + params.id;
        return { id: 1, name: compound };
    }),

    // A params schema overrides the string inferred from the path.
    get('/:id/coerced', { params: z.object({ id: z.coerce.number() }), response: Todo }, ({ params }) => {
        const id: number = params.id;
        return { id, name: 'x' };
    }),

    get('/', { query: z.object({ search: z.string().optional() }), response: z.array(Todo) }, ({ query }) => {
        const search: string | undefined = query.search;
        return [{ id: 1, name: search ?? 'all' }];
    }),

    post('/', { body: z.object({ name: z.string() }), response: Todo, status: 201 }, ({ body }) => {
        const name: string = body.name;
        return { id: 1, name };
    }),

    // Declared without schemas, and still able to read its own path parameters.
    get('/:id/raw', ({ params, query }) => {
        const id: string = params.id;
        const raw: Record<string, string> = query;
        return { id, keys: Object.keys(raw) };
    }),

    // @ts-expect-error - 'slug' is not a segment of '/:id'
    get('/:id', { response: Todo }, ({ params }) => ({ id: Number(params.slug), name: 'x' })),

    // @ts-expect-error - the returned shape must match the response schema
    get('/mismatched', { response: Todo }, () => ({ unexpected: true })),

    // @ts-expect-error - body is undefined without a body schema
    post('/bodyless', { response: Todo }, ({ body }) => ({ id: body.id, name: 'x' })),

    // @ts-expect-error - a static path exposes no parameters
    get('/static', ({ params }) => ({ nope: params.id })),
]);

describe('route typing', () => {
    it('builds the definitions the type assertions above were written against', () => {
        expect(routes.prefix).toBe('/todos');
        expect(routes.routes).toHaveLength(10);
        expect(routes.routes.map(route => route.method)).toContain('POST');
    });

    it('defaults schemas to an empty object when a route declares none', () => {
        const [, , , , , schemaless] = routes.routes;

        expect(schemaless?.schemas).toEqual({});
        expect(typeof schemaless?.handler).toBe('function');
    });
});
