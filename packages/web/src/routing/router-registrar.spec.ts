import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { z } from 'zod';

import { OrbContainer } from '@zenith-framework/core';
import { ZenithWebConfig } from '../config/zenith-web.config';
import { HttpServer } from '../web/http-server';
import { HttpRequestHandler } from '../web/http-request-handler';
import { NotFoundException } from '../web/http-exception';
import { RouterRegistrar } from './router-registrar';
import { get, post, router, isRouter } from './route';

class TestConfig extends ZenithWebConfig {
    override httpServerPort(): number {
        return 0;
    }
}

const Todo = z.object({ id: z.number(), name: z.string() });

function appWith(routers: Record<string, unknown>) {
    const container = new OrbContainer();
    container.registerModules([{ name: 'test', path: '/test/routes.ts', module: routers }]);
    const config = new TestConfig();
    const requestHandler = new HttpRequestHandler(container, { validate: () => true } as never);
    const httpServer = new HttpServer(container, requestHandler, config);
    new RouterRegistrar(container, httpServer, config).registerRouters();
    return httpServer;
}

describe('router()', () => {
    it('brands the object so the scanner can recognise it among other exports', () => {
        expect(isRouter(router('/todos', []))).toBe(true);
        expect(isRouter({ prefix: '/todos', routes: [] })).toBe(false);
        expect(isRouter(undefined)).toBe(false);
    });
});

describe('RouterRegistrar', () => {
    it('serves a route, validating query and response', async () => {
        const server = appWith({
            default: router('/todos', [
                get('/', {
                    query: z.object({ search: z.string().optional() }),
                    response: z.object({ todos: z.array(Todo) }),
                }, ({ query }) => ({ todos: query.search ? [] : [{ id: 1, name: 'first' }] })),
            ]),
        });
        await server.start();

        expect(await (await fetch(`http://localhost:${server.port}/todos`)).json())
            .toEqual({ todos: [{ id: 1, name: 'first' }] });
        expect(await (await fetch(`http://localhost:${server.port}/todos?search=x`)).json())
            .toEqual({ todos: [] });

        await server.stop();
    });

    it('passes path parameters through without a schema', async () => {
        const server = appWith({
            default: router('/todos', [
                get('/:id', ({ params }) => ({ echoed: params.id })),
            ]),
        });
        await server.start();

        expect(await (await fetch(`http://localhost:${server.port}/todos/42`)).json()).toEqual({ echoed: '42' });
        await server.stop();
    });

    it('rejects a body that fails its schema, saying which field', async () => {
        const server = appWith({
            default: router('/todos', [
                post('/', { body: z.object({ name: z.string().min(1) }) }, ({ body }) => body),
            ]),
        });
        await server.start();

        const response = await fetch(`http://localhost:${server.port}/todos`, {
            method: 'POST',
            body: JSON.stringify({ name: '' }),
        });

        expect(response.status).toBe(400);
        // A boolean validator can only say "invalid"; the schema knows the field.
        expect((await response.json()).details).toContain('name');
        await server.stop();
    });

    it('answers 400 rather than 500 when the body is not JSON', async () => {
        const server = appWith({
            default: router('/todos', [post('/', { body: Todo }, ({ body }) => body)]),
        });
        await server.start();

        const response = await fetch(`http://localhost:${server.port}/todos`, { method: 'POST', body: 'nope' });

        expect(response.status).toBe(400);
        await server.stop();
    });

    it('defaults POST to 201 and honours an explicit status', async () => {
        const server = appWith({
            default: router('/todos', [
                post('/', { body: z.object({ name: z.string() }) }, ({ body }) => body),
                post('/accepted', { body: z.object({ name: z.string() }), status: 202 }, ({ body }) => body),
            ]),
        });
        await server.start();

        const created = await fetch(`http://localhost:${server.port}/todos`, { method: 'POST', body: '{"name":"a"}' });
        const accepted = await fetch(`http://localhost:${server.port}/todos/accepted`, { method: 'POST', body: '{"name":"a"}' });

        expect(created.status).toBe(201);
        expect(accepted.status).toBe(202);
        await server.stop();
    });

    it('maps a thrown HttpException to its status', async () => {
        const server = appWith({
            default: router('/todos', [
                get('/:id', () => { throw new NotFoundException('no such todo'); }),
            ]),
        });
        await server.start();

        const response = await fetch(`http://localhost:${server.port}/todos/9`);

        expect(response.status).toBe(404);
        expect((await response.json()).details).toBe('no such todo');
        await server.stop();
    });

    it('turns an unexpected throw into a 500', async () => {
        const server = appWith({
            default: router('/todos', [get('/', () => { throw new Error('boom'); })]),
        });
        await server.start();

        expect((await fetch(`http://localhost:${server.port}/todos`)).status).toBe(500);
        await server.stop();
    });

    it('mounts routers exported under any name, not just default', async () => {
        const server = appWith({
            todoRoutes: router('/todos', [get('/', () => ({ ok: true }))]),
            somethingElse: 'not a router',
        });
        await server.start();

        expect((await fetch(`http://localhost:${server.port}/todos`)).status).toBe(200);
        await server.stop();
    });
});
