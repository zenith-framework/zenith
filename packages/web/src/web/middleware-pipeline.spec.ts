import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'bun:test';

import { OrbContainer } from '@zenith-framework/core';
import { Middleware } from '../decorators/middleware.decorator';
import { HttpRequestHandler } from './http-request-handler';
import { MiddlewarePipeline } from './middleware-pipeline';
import { ForbiddenException } from './http-exception';
import type { MiddlewareNext, ZenithMiddleware } from './middleware';

/** Records the order steps run in, shared across the middlewares of one test. */
let trace: string[] = [];

function pipelineOf(...middlewares: unknown[]): MiddlewarePipeline {
    const container = new OrbContainer();
    for (const middleware of middlewares) {
        container.registerOrb(middleware);
    }
    container.instanciateOrbs();
    const pipeline = new MiddlewarePipeline(container, new HttpRequestHandler(container, { validate: () => true } as never));
    pipeline.registerMiddlewares();
    return pipeline;
}

const request = () => new Request('http://localhost/todos');
const terminal = async () => {
    trace.push('handler');
    return new Response('handled');
};

describe('MiddlewarePipeline', () => {
    beforeEach(() => { trace = []; });

    it('runs middlewares as an onion, outermost first on the way in', async () => {
        @Middleware({ order: 1 })
        class Outer implements ZenithMiddleware {
            async handle(_request: Request, next: MiddlewareNext) {
                trace.push('outer:in');
                const response = await next();
                trace.push('outer:out');
                return response;
            }
        }

        @Middleware({ order: 2 })
        class Inner implements ZenithMiddleware {
            async handle(_request: Request, next: MiddlewareNext) {
                trace.push('inner:in');
                const response = await next();
                trace.push('inner:out');
                return response;
            }
        }

        // Registered inner-first to prove the chain follows order, not registration.
        const response = await pipelineOf(Inner, Outer).run(request(), terminal);

        expect(await response.text()).toBe('handled');
        expect(trace).toEqual(['outer:in', 'inner:in', 'handler', 'inner:out', 'outer:out']);
    });

    it('lets a middleware short-circuit without reaching the handler', async () => {
        @Middleware()
        class Blocking implements ZenithMiddleware {
            handle(): Promise<Response> {
                return Promise.resolve(new Response('blocked', { status: 429 }));
            }
        }

        const response = await pipelineOf(Blocking).run(request(), terminal);

        expect(response.status).toBe(429);
        expect(trace).toEqual([]);
    });

    it('can rewrite the response on the way out', async () => {
        @Middleware()
        class Stamping implements ZenithMiddleware {
            async handle(_request: Request, next: MiddlewareNext) {
                const response = await next();
                const headers = new Headers(response.headers);
                headers.set('X-Served-By', 'zenith');
                return new Response(response.body, { status: response.status, headers });
            }
        }

        const response = await pipelineOf(Stamping).run(request(), terminal);

        expect(response.headers.get('X-Served-By')).toBe('zenith');
        expect(await response.text()).toBe('handled');
    });

    it('maps a thrown HttpException to its status instead of crashing the request', async () => {
        @Middleware()
        class Rejecting implements ZenithMiddleware {
            handle(): Promise<Response> {
                throw new ForbiddenException('nope');
            }
        }

        const response = await pipelineOf(Rejecting).run(request(), terminal);

        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ status: 403, details: 'nope' });
    });

    it('turns an unexpected throw into a 500 rather than letting it escape', async () => {
        @Middleware()
        class Broken implements ZenithMiddleware {
            handle(): Promise<Response> {
                throw new Error('boom');
            }
        }

        const response = await pipelineOf(Broken).run(request(), terminal);

        expect(response.status).toBe(500);
    });

    it('rejects a middleware that calls next() twice', async () => {
        @Middleware()
        class Greedy implements ZenithMiddleware {
            async handle(_request: Request, next: MiddlewareNext) {
                await next();
                // Would run the route handler a second time.
                return await next();
            }
        }

        const response = await pipelineOf(Greedy).run(request(), terminal);

        expect(response.status).toBe(500);
        expect(trace).toEqual(['handler']);
    });

    it('orders middlewares sharing an order by name, so boots are reproducible', async () => {
        @Middleware()
        class Beta implements ZenithMiddleware {
            async handle(_request: Request, next: MiddlewareNext) { trace.push('beta'); return await next(); }
        }

        @Middleware()
        class Alpha implements ZenithMiddleware {
            async handle(_request: Request, next: MiddlewareNext) { trace.push('alpha'); return await next(); }
        }

        await pipelineOf(Beta, Alpha).run(request(), terminal);

        expect(trace).toEqual(['alpha', 'beta', 'handler']);
    });

    it('calls the handler directly when nothing is registered', async () => {
        const response = await pipelineOf().run(request(), terminal);

        expect(await response.text()).toBe('handled');
        expect(trace).toEqual(['handler']);
    });
});
